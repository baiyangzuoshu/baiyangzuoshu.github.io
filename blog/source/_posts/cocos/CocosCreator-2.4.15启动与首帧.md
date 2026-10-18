---
title: "Cocos Creator 2.4.15 启动流程：从引擎装配到首帧"
date: 2026-10-17 00:00:00
permalink: "2026/10/17/cocos/CocosCreator-2.4.15启动与首帧/"
categories:
  - Cocoscreator
description: "从 Creator 2.4.15 浏览器预览源码与运行轨迹出发，拆解引擎模块装配、game.run、预览场景加载和首帧更新绘制。"
tags:
  - Cocos Creator
  - 2.4.15
  - 源码
  - 启动流程
---

Cocos Creator 项目从打开预览到画出第一帧，中间并不是一次简单的 `game.run()`。引擎模块要先装配，预览宿主要准备脚本和资源，游戏运行时再初始化渲染与系统、加载当前场景，最后才进入更新和绘制。

本文沿着 **Cocos Creator 2.4.15 编辑器的 Chrome 浏览器预览**，把这条路径拆开来看。先说明边界：这里的事件顺序来自本地引擎源码和一次真实预览探针，不是对 Web 构建包、原生平台或所有项目都成立的时序承诺。

## 启动到首帧：先看全流程

![Cocos Creator 2.4.15 从预览入口到首帧的流程图](/images/2026/cocos/creator-2.4.15-startup-frame.png)

图中分为五段：模块装配、预览宿主、引擎初始化、首场景入场和首个已观测场景帧。最容易混淆的地方，是把“引擎准备好了”“场景开始运行”和“已经绘制出画面”当成同一个时刻。

## 一、模块装配：全局 `cc` 就绪，不等于游戏已启动

Creator 2.4.15 的引擎入口 `index.js` 先创建全局 `cc`，加载环境宏和 polyfill，再引入 `predefine`、`cocos2d` 与 `extends` 等模块。随后，`cc.game` 和 `cc.director` 等对象被挂到 `cc` 命名空间上。

这一步建立的是 API 和模块关系。它说明 `cc.director` 对象已经存在，却不代表 Director 已完成运行时初始化，更不代表场景已经加载。

## 二、预览宿主：当前场景由 Creator 预览页接入

浏览器预览除了引擎代码，还包含 Creator 编辑器提供的宿主脚本。`settings.js` 保存启动场景等工程设置；预览 `boot.js` 在插件脚本和内建资源包准备完成后调用：

```js
cc.game.run(option, onStart);
```

这里的 `onStart` 是本次预览宿主的后续接线。它暂停游戏、加载预览页提供的 `preview-scene.json`，再从 `SceneAsset` 取出场景对象并传给 `director.runSceneImmediate()`。

因此，本次预览实际加载场景的路径，不是游戏脚本调用 `cc.director.loadScene(name)`。后者仍是项目代码里按名称切换场景的公开 API；编辑器预览为了运行当前打开的场景，使用了自己的宿主流程。

## 三、`game.run()`：初始化引擎并安排主循环

进入 `CCGame.run()` 后，大致经历以下过程：

1. 读取运行配置，执行 `prepare()` 和预览脚本加载。
2. `_initEngine()` 初始化画布、渲染器和系统事件。
3. 发出 `EVENT_ENGINE_INITED`。Director 预先注册的监听器在此时调用 `director.init()`，建立调度器、节点激活器和引擎系统。
4. 选择帧请求方式，初始化内建资源。
5. `_runMainLoop()` 安排帧请求，随后发出 `EVENT_GAME_INITED` 并调用 `onStart`。

一个关键细节：Director 对象在模块装配时就创建了；`director.init()` 则是在 `EVENT_ENGINE_INITED` 触发时调用。不要把 `EVENT_GAME_INITED` 理解成 Director 对象刚刚出现的时刻。

另一个容易误读的细节是 `_runMainLoop()` 会提前安排帧回调。安排回调不等于当时已经绘制了带有活动场景的画面；预览宿主还要完成场景加载和入场。

## 四、场景入场和第一次更新绘制

在这次 Chrome 预览中，`onStart` 暂停游戏，加载 `preview-scene.json`，然后将场景交给 `runSceneImmediate()`。它的第二个参数名为 `onBeforeLoadScene`，宿主在这个回调里恢复游戏。之后依次发生场景启动事件和场景激活。

首个已观测场景帧进入 `CCDirector.mainLoop()`，过程可以概括为：

1. 计算本帧 `dt`。
2. 未暂停时执行更新阶段：更新前事件、组件 `start` 和 `update`、`Scheduler`、组件 `lateUpdate`、更新后事件。
3. 处理延迟销毁对象。
4. 触发绘制前事件，调用 `renderer.render(scene, dt)`，再触发绘制后事件。

渲染器后续如何把场景展开成具体绘制命令，属于渲染专题；这里的源码追踪只到 `renderer.render()` 入口。

## 一次预览的事件记录

探针使用 `performance.now()` 记录了这次预览的事件顺序。表中数字是导航开始后的毫秒数，只用来说明本次调用的先后，不代表固定耗时。

| 记录时间 | 事件 |
| ---: | --- |
| 229.2 / 229.8 | 调用 `game.run()` / `game.run()` 返回，准备工作继续异步执行 |
| 253.8 / 295.5 | `EVENT_ENGINE_INITED` / `EVENT_GAME_INITED` |
| 295.6 / 305.6 | 进入 `onStart` / 预览场景资源加载完成 |
| 305.7 / 313.3 | 调用 `runSceneImmediate()` / `AFTER_SCENE_LAUNCH` |
| 313.8 | 首次 `director.mainLoop()` |
| 314.0 / 315.0 | 首次更新前 / 更新后事件 |
| 315.1 / 317.3 | 首次绘制前 / 绘制后事件 |

本次记录中，首次 `director.mainLoop()` 出现在场景启动之后。它验证的是当前示例与这一次预览运行，不足以推导所有资源加载速度、设备或宿主下都保持同样顺序。

## 排查“预览没有首帧”时，可以按阶段定位

- **`cc` 或 API 不存在**：检查引擎入口、模块装配和预览 bundle 加载。
- **引擎初始化事件没有到达**：检查 `game.run()`、配置准备、渲染器初始化及系统初始化路径。
- **游戏已初始化但场景未显示**：检查预览宿主返回的场景资源、场景身份和 `runSceneImmediate()` 入场过程。
- **场景已启动但没有绘制事件**：检查主循环是否继续调度、游戏是否暂停，以及渲染入口是否收到活动场景。

暂停也要区分 API：`game.pause()` 会停止帧请求；`director.pause()` 影响逻辑更新，但 Director 主循环中的绘制路径仍可继续。排查时先确认调用的是哪一种暂停。

## 研究范围与参考资料

本次观察基于 Creator 2.4.15 的编辑器 Chrome 预览：读取了预览页、`settings.js` 和 Creator 安装包中的 `boot.js`，并用临时本机代理记录事件；没有修改引擎或游戏工程源码。工作区引擎文件 `index.js`、`CCGame.js`、`CCDirector.js` 的哈希也与已安装 Creator 对应文件核对一致。

本文没有把预览内部接线扩写成构建版或原生平台结论。Web 构建、原生宿主和小游戏平台应分别沿各自入口验证。

- [Creator 2.4 项目结构手册](https://docs.cocos.com/creator/2.4/manual/zh/getting-started/project-structure.html)
- [Creator 2.4 预览与构建手册](https://docs.cocos.com/creator/2.4/manual/zh/getting-started/basics/preview-build.html)
- [Creator 2.4 场景加载手册](https://docs.cocos.com/creator/2.4/manual/zh/scripting/scene-managing.html)
