---
title: Cocoscreator流程
date: 2024-09-26 11:29:57
categories:
  - Cocoscreator
tags:
  - 源码
---

平台：Web
版本:3.8.x
![Cocoscreator流程](/images/2024/cocoscreator.png)

    当我们打出web后，在build目录下会生成一个web-mobile文件夹，里面就是我们发布后的项目了。

在 web-mobile 文件夹下，有一个 index.html 文件，这个文件就是我们项目的入口文件。在 index.html 文件
中会加载 index.js 文件，在 index.js 文件中会加载 application.js 文件，在 application.js 文件中会
调用 init 函数和 start 函数。
在 init 函数中会初始化游戏引擎，在 start 函数中会启动游戏引擎。都是通过 game.js 文件来调用的。
game.ts 在被加载时，就会

```
export const game = cclegacy.game = new Game();
```

在 game:init 函数中，会做好启动引擎之前的工作，比如

```
screen.init();
assetManager.init();
director.init();
```

在 game:step 函数中，会调用

```
public step () {
    director.tick(this._calculateDT(true));
}
```

这里是游戏的主循环，每一帧都会调用一次。
在 director:tick 函数中，主要看 this.\_root!.frameMove(dt);这行代码，用于每帧执行渲染流程的入口函数

```
this._frameMoveBegin();
this._frameMoveProcess();
this._frameMoveEnd();
```

\_frameMoveBegin()清空场景和相机,
\_frameMoveProcess()重新生成快照,主要看 this.\_batcher.update()这行代码，用于更新所有节点的渲染信息
\_frameMoveEnd()渲染，this.\_pipeline.render(cameraList)这行代码，forwardStage:render(camera),
函数里面会调用 this.\_uiPhase.render(camera, renderPass)，用于渲染 UI

```
const pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, inputAssembler);
cmdBuff.bindPipelineState(pso);
cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
const ds = batch.descriptorSet!;
cmdBuff.bindDescriptorSet(SetIndex.LOCAL, ds);
cmdBuff.bindInputAssembler(inputAssembler);
cmdBuff.draw(inputAssembler);
```
