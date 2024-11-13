---
title: 使用分离轴定理（SAT）进行旋转矩形碰撞检测
date: 2024-11-13 10:33:20
categories:
- 算法
tags:
- 碰撞检测
---
![](/images/SAT.webp)

平台：cocoscreator 3.8.x
语言：typescript

## 前言
&emsp;&emsp;正在做一个项目，英雄有若干转刀，转刀会围绕英雄中心点旋转。如果用cocos自带的碰撞算法检测，不方便。
因此就找到分离轴定理算法，可以是缩放、放大、旋转多边形。

## 概述
&emsp;&emsp;在游戏开发中，碰撞检测是一个至关重要的部分，尤其是当处理复杂的物体如旋转矩形时。对于这类物体，传统的矩形碰撞检测方法不再适用，因为它们可能会旋转，并且需要更精确的检测方法。分离轴定理（SAT）是一个强大的算法，可以帮助我们检测两个旋转矩形是否发生碰撞。

&emsp;&emsp;本文将介绍如何利用分离轴定理（SAT）进行旋转矩形的碰撞检测，并通过Cocos Creator的TypeScript实现代码来展示具体的实现方法。

分离轴定理（SAT）简介
&emsp;&emsp;分离轴定理的核心思想是：如果两个凸多边形没有发生碰撞，那么存在一条直线（称为分离轴），使得这两个多边形在该轴上的投影是分开的。换句话说，如果两个物体的所有投影都没有重叠，那么它们就没有碰撞。反之，如果在任何一个轴上它们的投影有重叠，那么它们必然发生碰撞。

代码实现
&emsp;&emsp;在实现旋转矩形的碰撞检测时，我们需要使用分离轴定理来判断两个旋转矩形是否重叠。以下是一个使用TypeScript实现的代码示例。

### 1. 获取旋转矩形的四个顶点
&emsp;&emsp;首先，我们需要计算旋转矩形的四个顶点。这个过程通过矩阵旋转公式完成。

```
// 获取旋转矩形的顶点
public static getRotatedRectangle(x: number, y: number, size: { width: number, height: number }, angle: number, scale: number) {
    let halfWidth = size.width / 2 * scale;
    let halfHeight = size.height / 2 * scale;

    // 计算旋转矩形的四个顶点
    let rad = angle * (Math.PI / 180);
    let cos = Math.cos(rad);
    let sin = Math.sin(rad);

    return [
        { x: x + halfWidth * cos - halfHeight * sin, y: y + halfWidth * sin + halfHeight * cos },  // 右上
        { x: x - halfWidth * cos - halfHeight * sin, y: y - halfWidth * sin + halfHeight * cos },  // 左上
        { x: x - halfWidth * cos + halfHeight * sin, y: y - halfWidth * sin - halfHeight * cos },  // 左下
        { x: x + halfWidth * cos + halfHeight * sin, y: y + halfWidth * sin - halfHeight * cos }   // 右下
    ];
}
```

&emsp;&emsp;这段代码计算了旋转矩形的四个顶点。矩形的中心点、尺寸、旋转角度以及缩放因子（scale）作为参数传入。通过矩阵旋转，我们计算出每个顶点的坐标。

### 2. 投影矩形到轴上
&emsp;&emsp;接下来，我们需要将矩形投影到一个轴上。这里我们使用的是矩形的边作为投影轴，计算矩形在这些轴上的投影区间。

```
// 将矩形投影到轴上
public static projectRectangle(rect: any[], axis: { x: number, y: number }) {
    // 归一化轴向量
    let length = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
    let normalizedAxis = { x: axis.x / length, y: axis.y / length };

    let min = (rect[0].x * normalizedAxis.x + rect[0].y * normalizedAxis.y);
    let max = min;

    for (let i = 1; i < rect.length; i++) {
        let projection = (rect[i].x * normalizedAxis.x + rect[i].y * normalizedAxis.y);
        if (projection < min) {
            min = projection;
        }
        if (projection > max) {
            max = projection;
        }
    }

    return { min, max };
}
```

&emsp;&emsp;此方法将矩形的每个顶点投影到指定轴上，并返回该轴上的最小和最大投影值。

### 3. 检查矩形是否重叠
&emsp;&emsp;现在，我们有了每个矩形在不同轴上的投影区间。为了检查两个矩形是否发生碰撞，我们将它们的投影区间进行比较。如果在任何一个轴上，它们的投影区间没有重叠，那么这两个矩形就没有碰撞。

```
// 分离轴定理（SAT）用于旋转矩形之间的碰撞检测
public static isRotatedRectanglesOverlapping(rect1: any[], rect2: any[]): boolean {
    let axes = [
        // 矩形1的边的法向量
        { x: -(rect1[1].y - rect1[0].y), y: rect1[1].x - rect1[0].x },
        { x: -(rect1[2].y - rect1[1].y), y: rect1[2].x - rect1[1].x },
        // 矩形2的边的法向量
        { x: -(rect2[1].y - rect2[0].y), y: rect2[1].x - rect2[0].x },
        { x: -(rect2[2].y - rect2[1].y), y: rect2[2].x - rect2[1].x }
    ];

    for (let axis of axes) {
        let projection1 = this.projectRectangle(rect1, axis);
        let projection2 = this.projectRectangle(rect2, axis);

        if (projection1.max < projection2.min || projection2.max < projection1.min) {
            return false;  // 没有重叠
        }
    }

    return true;  // 发生重叠
}
```

使用案例

```
// 检查新车子的位置是否与现有车子重叠
isOverlapping(newCar:cc.Node, carSize: { width: number, height: number },existingCars:any[]): boolean {
    // 生成当前车子的旋转矩形
    let carWorldPos=newCar.convertToWorldSpaceAR(cc.v3(0,0,0));
    let carWorldRotation = util.getWorldRotation(newCar);
    let newRect = util.getRotatedRectangle(carWorldPos.x, carWorldPos.y, carSize, carWorldRotation,carSacle);
    let newID=newCar.getComponent(MapCar).getID();

    for (let car of existingCars) {
        let carWorldPos2=car.node.convertToWorldSpaceAR(cc.v3(0,0,0));
        let carWorldRotation2 = util.getWorldRotation(car.node);
        let existingCar = util.getRotatedRectangle(carWorldPos2.x, carWorldPos2.y, car.size, carWorldRotation2,carSacle);
        let existID=car.node.getComponent(MapCar).getID();
        // 使用分离轴定理进行旋转矩形碰撞检测
        if (util.isRotatedRectanglesOverlapping(newRect, existingCar)&&existID!=newID) {
            return true;  // 发生重叠
        }
    }
    return false;  // 没有重叠
}
```

&emsp;&emsp;这段代码计算了两个矩形在所有可能的轴上的投影，并检查是否有任何轴上的投影区间没有重叠。如果任何一个轴的投影不重叠，则返回 false，表示没有碰撞；如果所有轴上的投影都重叠，则返回 true，表示发生了碰撞。

## 总结
&emsp;&emsp;通过应用分离轴定理（SAT），我们能够高效地检测旋转矩形之间的碰撞。我们首先计算出矩形的顶点，然后将这些顶点投影到矩形边的法向量上，最后通过比较投影区间来确定矩形是否发生碰撞。

&emsp;&emsp;这种方法不仅适用于旋转矩形，也可以扩展到其他类型的凸多边形。通过此算法，我们能够确保游戏中的物体碰撞检测更加精确和高效。




