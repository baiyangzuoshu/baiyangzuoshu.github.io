---
title: Cocoscreator中实现纹理合批
date: 2025-03-22 08:50:30
categories:
  - Cocoscreator
tags:
  - 优化
---

# 前言

最近在优化停车场小游戏，其中有一个是减少 DC。停车场小游戏是 3D 转 2D 的项目，因此车子使用的是 9 个方向，通过镜像翻转等实现 32 个方向。
简单点说，360 度的角度，渲染了 32 个方向，每个方向的间隔是 11.25 度。这样的好处是丰富了车子的形态，坏处则是资源变大，无法通过简单的大图解决合批问题。

# DC 是什么

简单来说，DC 代表了 CPU 向 GPU 发送的渲染调用次数，每一次调用都可能涉及状态切换、资源绑定等昂贵操作。当游戏场景中精灵数量庞大、各自使用不同纹理时，DC 数量会急剧增加，从而引发性能瓶颈，导致帧率下降甚至卡顿。因此，如何在保证画面效果的前提下尽可能减少 DC，是优化游戏渲染性能的关键所在。

在 CocosCreator 3.8.5 中，实现合批渲染需要满足几个条件：

1. 同一材质和 Shader：只有共用相同材质和 Shader 的精灵才能合批；
2. 一致的渲染数据格式：精灵必须在顶点属性、纹理格式等方面保持一致；
3. 统一纹理绑定问题：传统单纹理绑定方式无法满足同时渲染多个纹理的需求。

# IAssembler 是什么

在 Cocos Creator 3D 中，IAssembler 是引擎渲染管线中的一个 接口，用于管理 几何数据的组装 和 顶点缓冲区的更新。简单来说，它决定了 如何组织渲染对象的顶点数据，并将其提交给 GPU。

在默认情况下，Cocos Creator 提供了一些 内置的 IAssembler 实现，用于处理 普通精灵（Sprite）、粒子（Particle）、文本（Label） 等不同类型的渲染组件。例如：
• SimpleSpriteAssembler 处理基础的 2D 精灵 渲染。
• LabelAssembler 负责 文本 的渲染。
• ParticleAssembler 处理 粒子系统。

# 多纹理合批

为了解决最后一个问题，需要使用自定义 Shader。在我的方案中，通过在 Shader 中预先绑定多个纹理（例如 texture0 到 texture15），并在顶点数据中加入额外的纹理索引属性（a_texture_idx），让每个精灵在渲染时能够根据自己的属性选择正确的纹理采样器。这样，就能在同一个 Shader 中处理多个纹理，从而实现合批，降低 DC 数量，极大地提升渲染效率。

而这背后的关键技术之一，就是对 CocosCreator 源码中 IAssembler 接口的扩展。IAssembler 是负责生成和更新精灵渲染数据的接口，它决定了如何将顶点位置、UV、颜色以及其他数据组织到顶点缓冲区中。在默认实现中，IAssembler 仅考虑基本的数据组装工作，并没有对多纹理的需求进行扩展。为此，我对 IAssembler 进行了自定义扩展：
• 扩展顶点属性：在原有位置、UV 和颜色数据之外，我增加了纹理索引属性，用以在顶点层面传递当前精灵所使用的纹理 ID。
• 数据更新机制：在每次渲染数据更新时，我不仅更新了精灵的位置信息、UV 坐标，还增加了纹理索引的更新逻辑。这样一来，当精灵的纹理信息发生变化时，可以通过标记（textureIdxDirty）及时刷新顶点数据，确保渲染时 Shader 能够采样到正确的纹理。

自定义的 IAssembler 与配套 Shader 相辅相成，实现了多纹理合批的效果。在 Shader 端，通过顶点着色器将 a_texture_idx 传递给片元着色器，再由片元着色器根据纹理索引使用 if-else 条件判断，从对应绑定的纹理中采样颜色，最终再结合精灵的其他颜色信息输出最终像素。虽然这种分支判断方式在性能上存在一定开销，但它已经能够满足当前大多数项目的需求。当然，未来可以考虑使用纹理采样器数组等技术，进一步优化 Shader 逻辑，减少分支成本。

# 代码

```
import { _decorator, Component, Node, Material, Sprite, gfx, IAssembler, Color, __private, UI, SpriteFrame, RenderData, SpriteFrameEvent } from 'cc';
import SpriteAtlasManager from '../../Scripts/Manager/SpriteAtlasManager';
import { EDITOR } from 'cc/env';
import { MultiTextureManager } from '../../Scripts/Manager/MultiTextureManager';
const { ccclass, property, executeInEditMode } = _decorator;

const Attribute = gfx.Attribute;

const attributes: gfx.Attribute[] = [
    new Attribute('a_position', gfx.Format.RGB32F),
    new Attribute('a_texCoord', gfx.Format.RG32F),
    new Attribute('a_color', gfx.Format.RGBA32F),
    new Attribute('a_texture_idx', gfx.Format.R32F),
];

interface IRenderData {
    x: number;
    y: number;
    z: number;
    u: number;
    v: number;
    color: Color;
}

const QUAD_INDICES = Uint16Array.from([0, 1, 2, 1, 3, 2]);

export const simple: IAssembler = {
    createData(sprite: Sprite) {
        const data = RenderData.add(attributes);
        const renderData = data;
        renderData.dataLength = 4;
        renderData.resize(4, 6);
        renderData.chunk.setIndexBuffer(QUAD_INDICES);

        return renderData;
    },

    updateRenderData(sprite: MultiTexture2d) {
        const frame = sprite.spriteFrame;
        this.updateUVs(sprite);
        // 如有需要可更新颜色，此处根据实际情况开启
        // this.updateColor(sprite);

        const renderData = sprite.renderData;
        if (renderData && frame) {
            if (renderData.vertDirty) {
                this.updateVertexData(sprite);
            }
            // 新增：如果纹理索引有变动，则更新之
            if (sprite.textureIdxDirty) {
                this.updateTextureIdx(sprite);
            }
            renderData.updateRenderData(sprite, frame);
        }
    },

    updateWorldVerts(sprite: Sprite, chunk: __private._cocos_2d_renderer_static_vb_accessor__StaticVBChunk) {
        const renderData = sprite.renderData!;
        const vData = chunk.vb;
        const dataList = renderData.data;
        const node = sprite.node;
        const m = node.worldMatrix;
        const m00 = m.m00, m01 = m.m01, m02 = m.m02, m03 = m.m03;
        const m04 = m.m04, m05 = m.m05, m06 = m.m06, m07 = m.m07;
        const m12 = m.m12, m13 = m.m13, m14 = m.m14, m15 = m.m15;
        const stride = renderData.floatStride; // 现在为 10
        let offset = 0;
        const length = dataList.length;
        for (let i = 0; i < length; ++i) {
            const curData = dataList[i];
            const x = curData.x;
            const y = curData.y;
            let rhw = m03 * x + m07 * y + m15;
            rhw = rhw ? 1 / rhw : 1;
            offset = i * stride;
            vData[offset + 0] = (m00 * x + m04 * y + m12) * rhw;
            vData[offset + 1] = (m01 * x + m05 * y + m13) * rhw;
            vData[offset + 2] = (m02 * x + m06 * y + m14) * rhw;
        }
    },

    fillBuffers(sprite: Sprite, renderer:  __private._cocos_2d_renderer_i_batcher__IBatcher) {
        if (sprite === null) return;
        const renderData = sprite.renderData!;
        const chunk = renderData.chunk;
        if (sprite._flagChangedVersion !== sprite.node.flagChangedVersion || renderData.vertDirty) {
            this.updateWorldVerts(sprite, chunk);
            renderData.vertDirty = false;
            sprite._flagChangedVersion = sprite.node.flagChangedVersion;
        }
        const vidOrigin = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        const vid = vidOrigin;
        // 填充索引数据
        ib[indexOffset++] = vid;
        ib[indexOffset++] = vid + 1;
        ib[indexOffset++] = vid + 2;
        ib[indexOffset++] = vid + 1;
        ib[indexOffset++] = vid + 3;
        ib[indexOffset++] = vid + 2;
        meshBuffer.indexOffset += 6;
    },

    updateVertexData(sprite: Sprite) {
        const renderData: RenderData | null = sprite.renderData;
        if (!renderData) return;
        const uiTrans = sprite.node._uiProps.uiTransformComp!;
        const dataList = renderData.data;
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const appX = uiTrans.anchorX * cw;
        const appY = uiTrans.anchorY * ch;
        let l = 0, b = 0, r = 0, t = 0;
        if (sprite.trim) {
            l = -appX;
            b = -appY;
            r = cw - appX;
            t = ch - appY;
        } else {
            const frame = sprite.spriteFrame!;
            const originSize = frame.originalSize;
            const ow = originSize.width;
            const oh = originSize.height;
            const scaleX = cw / ow;
            const scaleY = ch / oh;
            const trimmedBorder = frame.trimmedBorder;
            l = trimmedBorder.x * scaleX - appX;
            b = trimmedBorder.z * scaleY - appY;
            r = cw + trimmedBorder.y * scaleX - appX;
            t = ch + trimmedBorder.w * scaleY - appY;
        }
        // 注意：此处 dataList 存放的是逻辑顶点数据
        dataList[0].x = l;
        dataList[0].y = b;
        dataList[1].x = r;
        dataList[1].y = b;
        dataList[2].x = l;
        dataList[2].y = t;
        dataList[3].x = r;
        dataList[3].y = t;
        renderData.vertDirty = true;
    },

    updateUVs(sprite: Sprite) {
        if (!sprite.spriteFrame) return;
        const renderData = sprite.renderData!;
        const vData = renderData.chunk.vb;
        const uv = sprite.spriteFrame.uv;
        const stride = renderData.floatStride; // 现在为 10
        // 顶点 0
        vData[3] = uv[0];
        vData[4] = uv[1];
        // 顶点 1（偏移：stride + 3）
        vData[stride + 3] = uv[2];
        vData[stride + 4] = uv[3];
        // 顶点 2（偏移：2*stride + 3）
        vData[2 * stride + 3] = uv[4];
        vData[2 * stride + 4] = uv[5];
        // 顶点 3（偏移：3*stride + 3）
        vData[3 * stride + 3] = uv[6];
        vData[3 * stride + 4] = uv[7];
    },

    updateColor(sprite: Sprite) {
        const renderData = sprite.renderData!;
        const vData = renderData.chunk.vb;
        let colorOffset = 5;
        const color = sprite.color;
        const colorR = color.r / 255;
        const colorG = color.g / 255;
        const colorB = color.b / 255;
        const colorA = color.a / 255;
        for (let i = 0; i < 4; i++, colorOffset += renderData.floatStride) {
            vData[colorOffset]     = colorR;
            vData[colorOffset + 1] = colorG;
            vData[colorOffset + 2] = colorB;
            vData[colorOffset + 3] = colorA;
        }
    },

    // 新增：更新纹理索引数据
    updateTextureIdx(sprite: any) {
        const renderData = sprite.renderData!;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride; // 应为 10
        for (let i = 0; i < 4; i++) {
            vData[i * stride + 9] = sprite.textureIdx;
        }

        sprite.textureIdxDirty = false;
    },
};



@ccclass('MultiTexture2d')
@executeInEditMode
export class MultiTexture2d extends Sprite {
    @property
    textureIdx: number = 0;
    textureIdxDirty: boolean = true;

    handle: number = -1;
    start () {
        // @ts-ignore
        // 因为已经批量上传了纹理，所以就不需要引擎计算的texture哈希值，不然会打断dc
        this.spriteFrame._texture._textureHash = 9999;

        const material = this.getRenderMaterial(0);

        if(EDITOR){
            return;
        }
        for(const v of MultiTextureManager.Instance.data){
            //console.log(v);
            material.setProperty("texture"+v.textureID,SpriteAtlasManager.Instance.carAtlas[v.carType][v.carColor-1].getTexture());
        }
    }

    private _updateUVs (): void {
        if (this._assembler) {
            this._assembler.updateUVs(this);
        }
    }

    protected _flushAssembler () {
        const assembler = simple;

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this._renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this._renderData!.material = this.getRenderMaterial(0);
                this.markForUpdateRenderData();
                if (this.spriteFrame) {
                    this._assembler.updateUVs(this);
                }
                this._updateColor();
            }
        }

        // Only Sliced type need update uv when sprite frame insets changed
        if (this._spriteFrame) {
            if (this._type === 1) {
                this._spriteFrame.on(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
            } else {
                this._spriteFrame.off(SpriteFrameEvent.UV_UPDATED, this._updateUVs, this);
            }
        }
    }
}

```

下面是 shader

```
// Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.
CCEffect %{
  techniques:
  - passes:
    - vert: sprite-vs:vert
      frag: sprite-fs:frag
      depthStencilState:
        depthTest: false
        depthWrite: false
      blendState:
        targets:
        - blend: true
          blendSrc: src_alpha
          blendDst: one_minus_src_alpha
          blendDstAlpha: one_minus_src_alpha
      rasterizerState:
        cullMode: none
      properties:

        texture0: { value: white }
        texture1: { value: white }
        texture2: { value: white }
        texture3: { value: white }

        texture4: { value: white }
        texture5: { value: white }
        texture6: { value: white }
        texture7: { value: white }

        texture8: { value: white }
        texture9: { value: white }
        texture10: { value: white }
        texture11: { value: white }

        texture12: { value: white }
        texture13: { value: white }
        texture14: { value: white }
        texture15: { value: white }


        alphaThreshold: { value: 0.5 }
}%

CCProgram sprite-vs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>
  #if USE_LOCAL
    #include <builtin/uniforms/cc-local>
  #endif
  #if SAMPLE_FROM_RT
    #include <common/common-define>
  #endif
  in vec3 a_position;
  in vec2 a_texCoord;
  in vec4 a_color;

  out vec4 color;
  out vec2 uv0;

  in float a_texture_idx;
  out float texture_idx;

  vec4 vert () {
    texture_idx = a_texture_idx;
    vec4 pos = vec4(a_position, 1);

    #if USE_LOCAL
      pos = cc_matWorld * pos;
    #endif

    #if USE_PIXEL_ALIGNMENT
      pos = cc_matView * pos;
      pos.xyz = floor(pos.xyz);
      pos = cc_matProj * pos;
    #else
      pos = cc_matViewProj * pos;
    #endif

    uv0 = a_texCoord;
    #if SAMPLE_FROM_RT
      CC_HANDLE_RT_SAMPLE_FLIP(uv0);
    #endif
    color = a_color;

    return pos;
  }
}%

CCProgram sprite-fs %{
  precision highp float;
  #include <builtin/internal/embedded-alpha>
  #include <builtin/internal/alpha-test>

  in vec4 color;
  #if USE_TEXTURE
    in vec2 uv0;
    #pragma builtin(local)
    layout(set = 2, binding = 10) uniform sampler2D cc_spriteTexture;
    in float texture_idx;
  #endif

  uniform sampler2D texture0;
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  uniform sampler2D texture3;

  uniform sampler2D texture4;
  uniform sampler2D texture5;
  uniform sampler2D texture6;
  uniform sampler2D texture7;

  uniform sampler2D texture8;
  uniform sampler2D texture9;
  uniform sampler2D texture10;
  uniform sampler2D texture11;

  uniform sampler2D texture12;
  uniform sampler2D texture13;
  uniform sampler2D texture14;
  uniform sampler2D texture15;


  vec4 frag () {
    vec4 o = vec4(1, 1, 1, 1);

    #if USE_TEXTURE
      if(texture_idx < 1.0) {
        o *= CCSampleWithAlphaSeparated(texture0, uv0);
      }
      else if(texture_idx < 2.0) {
        o *= CCSampleWithAlphaSeparated(texture1, uv0);
      }
      else if(texture_idx < 3.0) {
        o *= CCSampleWithAlphaSeparated(texture2, uv0);
      }
      else if(texture_idx < 4.0) {
        o *= CCSampleWithAlphaSeparated(texture3, uv0);
      }
      else if(texture_idx < 5.0) {
        o *= CCSampleWithAlphaSeparated(texture4, uv0);
      }
      else if(texture_idx < 6.0) {
        o *= CCSampleWithAlphaSeparated(texture5, uv0);
      }
      else if(texture_idx < 7.0) {
        o *= CCSampleWithAlphaSeparated(texture6, uv0);
      }
      else if(texture_idx < 8.0) {
        o *= CCSampleWithAlphaSeparated(texture7, uv0);
      }
      else if(texture_idx < 9.0) {
        o *= CCSampleWithAlphaSeparated(texture8, uv0);
      }
      else if(texture_idx < 10.0) {
        o *= CCSampleWithAlphaSeparated(texture9, uv0);
      }
      else if(texture_idx < 11.0) {
        o *= CCSampleWithAlphaSeparated(texture10, uv0);
      }
      else if(texture_idx < 12.0) {
        o *= CCSampleWithAlphaSeparated(texture11, uv0);
      }
      else if(texture_idx < 13.0) {
        o *= CCSampleWithAlphaSeparated(texture12, uv0);
      }
      else if(texture_idx < 14.0) {
        o *= CCSampleWithAlphaSeparated(texture13, uv0);
      }
      else if(texture_idx < 15.0) {
        o *= CCSampleWithAlphaSeparated(texture14, uv0);
      }
      else if(texture_idx < 16.0) {
        o *= CCSampleWithAlphaSeparated(texture15, uv0);
      }


      #if IS_GRAY
        float gray  = 0.2126 * o.r + 0.7152 * o.g + 0.0722 * o.b;
        o.r = o.g = o.b = gray;
      #endif
    #endif

    o *= color;
    ALPHA_TEST(o);
    return o;
  }
}%

```
