---
title: ECS架构的实践与思考
date: 2025-05-26 10:54:34
categories:
- 游戏开发
tags:
- ECS
---
![](/images/2025/ECS.png)
&emsp;&emsp;随着游戏规模不断扩大，传统的面向对象（OOP）开发方式逐渐显露出一些明显的局限性，比如类继承结构的复杂性、代码的高度耦合和难以扩展，特别是在游戏逻辑频繁变动、实体类型丰富的项目中尤为明显。
&emsp;&emsp;传统开发模式通常是通过继承来定义游戏对象，每个对象都包含数据和行为，这种设计容易导致类体系复杂且僵化，修改或新增功能时牵一发而动全身，不利于扩展与维护。同时，频繁创建和销毁对象也会带来额外的性能开销。
&emsp;&emsp;针对这些问题，ECS（Entity-Component-System）架构应运而生，它以数据驱动为核心思想，将实体（Entity）、数据（Component）和逻辑（System）完全分离，显著提升了游戏架构的灵活性、性能和扩展性。

## 一、ECS 架构概览
- Entity（实体）：游戏中的对象标识，仅包含唯一 ID，没有行为和数据。
- Component（组件）：纯数据结构，定义实体的属性（如位置、速度、渲染节点引用）。
- System（系统）：逻辑单元，遍历拥有特定组件组合的实体，执行行为（如移动、渲染、碰撞检测）。

三者职责分离，数据与逻辑完全解耦，组合灵活，便于性能优化与多线程并行。

## 二、基础实现

### 1. 核心类定义
   ```
export class Position  {
    constructor(private x: number,private  y: number,private  z: number) {
        
    }
}

import { Entity } from "../Entity";

export abstract class System {
    protected requiredComponents: string[] = [];

    constructor(required: string[]) {
        this.requiredComponents = required;
    }

    public abstract update(entities: Entity[], deltaTime: number): void;
}

export class Entity {
  public id: number;

  private components: Map<string, any>;

  constructor(id: number) {
    this.id = id;
    this.components = new Map();
  }

  addComponent(component: any): void {
    const compName = component.constructor.name;
    this.components.set(compName, component);
  }

  getComponent<T>(compClass: { new (...args: any[]): T }): T | undefined {
    return this.components.get(compClass.name);
  }

  removeComponent<T>(compClass: { new (...args: any[]): T }): void {
    this.components.delete(compClass.name);
  }

  hasComponent<T>(compClass: { new (...args: any[]): T }): boolean {
    return this.components.has(compClass.name);
  }
}

// 4. 定义World类，管理实体和系统
export class World {
    private entities: Entity[] = [];
    private systems: System[] = [];
    private nextEntityId: number = 1;

    createEntity(): Entity {
        const entity = new Entity(this.nextEntityId++);
        this.entities.push(entity);
        return entity;
    }

    destroyEntity(entity: Entity): void {
        this.entities = this.entities.filter(e => e !== entity);
    }

    addComponent<T>(entity: Entity, component: T): void {
        entity.addComponent(component);
    }

    addSystem(system: System): void {
        this.systems.push(system);
    }

    private getEntitiesWith(componentNames: string[]): Entity[] {
        return this.entities.filter(entity =>
            componentNames.every(name => entity.hasComponent({ name } as any))
        );
    }

    update(deltaTime: number): void {
        for (const system of this.systems) {
            const entitiesToUpdate = this.getEntitiesWith((system as any).requiredComponents);
            system.update(entitiesToUpdate, deltaTime);
        }
    }
}
```

### 2.实现
```
export class MovementSystem extends System {
  constructor() {
    super(["Position", "Velocity"]);
  }
  public update(entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const pos = entity.getComponent(Position)!;
      const vel = entity.getComponent(Velocity)!;
      pos.x += vel.vx * deltaTime;
      pos.y += vel.vy * deltaTime;
    }
  }
}

export class Velocity  {
    constructor(private vx: number,private vy: number) {
    }
}

```

### 3.测试
```
// 5. 测试示例：创建世界、实体、添加组件、注册系统并运行更新
const world = new World();

// 创建两个实体
const player = world.createEntity();
const enemy = world.createEntity();

// 为实体添加组件
world.addComponent(player, new Position(0, 0, 0));
world.addComponent(player, new Velocity(1, 0)); // player初始速度(1,0)
world.addComponent(enemy, new Position(5, 5, 0));
world.addComponent(enemy, new Velocity(0, -1)); // enemy初始速度(0,-1)

// 注册移动系统
world.addSystem(new MovementSystem());

// 模拟游戏帧更新（deltaTime=1，例如1秒）
world.update(1);
```