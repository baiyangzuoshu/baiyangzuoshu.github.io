---
title: Cocoscreator流程
date: 2024-09-26 11:29:57
categories:
- Cocoscreator
tags:
---
平台：Web
版本:3.8.x
![Cocoscreator流程](/images/cocoscreator.png)

    当我们打出web后，在build目录下会生成一个web-mobile文件夹，里面就是我们发布后的项目了。
在web-mobile文件夹下，有一个index.html文件，这个文件就是我们项目的入口文件。在index.html文件
中会加载index.js文件，在index.js文件中会加载application.js文件，在application.js文件中会
调用init函数和start函数。
    在init函数中会初始化游戏引擎，在start函数中会启动游戏引擎。都是通过game.js文件来调用的。
game.ts在被加载时，就会

```
export const game = cclegacy.game = new Game();
```

在game:init函数中，会做好启动引擎之前的工作，比如

```
screen.init();
assetManager.init();
director.init();
```

在game:step函数中，会调用

```
public step () {
    director.tick(this._calculateDT(true));
}
```

这里是游戏的主循环，每一帧都会调用一次。
    在director:tick函数中，主要看this._root!.frameMove(dt);这行代码，用于每帧执行渲染流程的入口函数

```
this._frameMoveBegin();
this._frameMoveProcess();
this._frameMoveEnd();
```

_frameMoveBegin()清空场景和相机,
_frameMoveProcess()重新生成快照,主要看this._batcher.update()这行代码，用于更新所有节点的渲染信息
_frameMoveEnd()渲染，this._pipeline.render(cameraList)这行代码，forwardStage:render(camera),
函数里面会调用this._uiPhase.render(camera, renderPass)，用于渲染UI

```
const pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, inputAssembler);
cmdBuff.bindPipelineState(pso);
cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
const ds = batch.descriptorSet!;
cmdBuff.bindDescriptorSet(SetIndex.LOCAL, ds);
cmdBuff.bindInputAssembler(inputAssembler);
cmdBuff.draw(inputAssembler);
```

