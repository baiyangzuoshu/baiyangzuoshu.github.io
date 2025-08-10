---
title: 初探BFS
date: 2025-08-09 19:28:41
categories:
  - 算法
tags:
  - BFS
---

![](</images/2025/bfs-vs-dfs-(1).png>)

语言：typescript

## 前言

&emsp;&emsp;最近做的项目有类似连连看消除的功能，需要使用到 BFS 算法，因此想先初探一下 BFS 算法。

## 概述

&emsp;&emsp;广度优先搜索（Breadth-First Search, BFS）作为一种系统地遍历图或树节点的算法，其思想最早可以追溯到 20 世纪中期。德国计算机先驱康拉德·楚澤（Konrad Zuse）在 1945 年的博士论文中首次描述了类似于 BFS 的算法思想。当时楚澤正致力于设计世界上第一种高级编程语言——Plankalkül。在其未发表的博士论文（由于二战后局势未能提交，直到 1972 年才出版）中，楚澤给出了一个完整的示例程序，用于计算图的连通分量。这份示例程序使用的正是广度优先的搜索策略：从图中某一节点出发，按层次遍历整个图，以标记和计数不连通图中的各个组件。这可以被视为 BFS 算法的雏形，其背景属于图论范畴（寻找图的连通组件的问题）。值得注意的是，楚澤的工作发生在计算机科学正式诞生之初，他从工程和数学角度出发，在算法层面提出了这一思想，但当时并未引起学界广泛关注，因为论文迟迟未出版。 虽然楚澤在 1945 年就提出了 BFS 思想，但这一成果当时并没有传播开来。直到 20 世纪 50 年代末，BFS 算法才在学术出版物中正式露面。

代码实现
&emsp;&emsp;BFS 算法的代码实现如下：

### 1. 定义数据结构

&emsp;&emsp;首先，我们需要定义一个数据结构来表示图的节点。每个节点包含节点的坐标和到起始节点的距离。

```
const grid = [
  [".", ".", ".", "#", "."],
  [".", "#", ".", "#", "."],
  ["P", ".", ".", ".", "."],
  [".", "#", "B", "#", "."],
  [".", ".", ".", ".", "."],
];
```

&emsp;&emsp;这段代码定义了一个二维数组 `grid`，表示一个网格图。每个元素可以是 "." 表示空位置，"#" 表示障碍物，"P" 表示玩家，"B" 表示目标。

### 2. 查找玩家位置

&emsp;&emsp;接下来，我们需要查找玩家的位置。这里我们使用的是玩家的字符 "P" 来查找。

```
interface Pos {
  x: number;
  y: number;
}

const _dirs = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
];

console.table(grid);

function findPlayer(grid: string[][], player: string) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === player) {
        return { x, y };
      }
    }
  }

  return { x: -1, y: -1 };
}

const pos = findPlayer(grid, "P");
console.log("P pos:", pos);
```

### 3. 查找玩家到目标的最短路径

&emsp;&emsp;接下来，我们需要查找玩家到目标的最短路径。这里我们使用的是玩家的字符 "P" 和目标的字符 "B" 来查找。

```
unction findPlayerToBox(
  grid: string[][],
  player: string,
  box: string
): number {
  const pos = findPlayer(grid, player);
  if (pos.x == -1 || pos.y == -1) {
    return -1;
  }
  const queue: { pos: Pos; curStep: number }[] = [];
  const visited = new Set<string>();
  queue.push({ pos, curStep: 0 });
  visited.add(${pos.x},${pos.y});
  while (queue.length > 0) {
    const { pos: curPos, curStep } = queue.shift();
    for (let i = 0; i < _dirs.length; i++) {
      const ny = curPos.y + _dirs[i].y;
      const nx = curPos.x + _dirs[i].x;
      if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) {
        continue;
      }
      if (visited.has(${nx},${ny})) {
        continue;
      }
      const tag = grid[ny][nx];
      if ("#" == tag) {
        continue;
      }
      if (box == tag) {
        return curStep + 1;
      }
      queue.push({ pos: { x: nx, y: ny }, curStep: curStep + 1 });
      visited.add(${nx},${ny});
    }
  }
  return -1;
}

const step = findPlayerToBox(grid, "P", "B");
console.log("step:", step);
```

### 4. 回朔路径

```
function findPlayerToBox(
  grid: string[][],
  player: string,
  box: string
): { step: number; path: Pos[] } {
  const start = findPlayer(grid, player);
  if (start.x === -1 || start.y === -1) {
    return { step: -1, path: [] };
  }

  const queue: { pos: Pos; curStep: number }[] = [];
  const visited = new Set<string>();
  const parent = new Map<string, string>(); // child -> parent

  queue.push({ pos: start, curStep: 0 });
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const { pos: curPos, curStep } = queue.shift()!;
    for (let i = 0; i < _dirs.length; i++) {
      const ny = curPos.y + _dirs[i].y;
      const nx = curPos.x + _dirs[i].x;

      // 边界检查
      if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) {
        continue;
      }
      if (visited.has(`${nx},${ny}`)) {
        continue;
      }
      const tag = grid[ny][nx];
      if (tag === "#") {
        continue;
      }

      // 记录父节点
      parent.set(`${nx},${ny}`, `${curPos.x},${curPos.y}`);

      if (tag === box) {
        // 回溯路径
        const path: Pos[] = [];
        let curKey = `${nx},${ny}`;
        while (curKey) {
          const [x, y] = curKey.split(",").map(Number);
          path.push({ x, y });
          curKey = parent.get(curKey) || "";
        }
        path.reverse(); // 从起点到终点
        return { step: curStep + 1, path };
      }

      queue.push({ pos: { x: nx, y: ny }, curStep: curStep + 1 });
      visited.add(`${nx},${ny}`);
    }
  }

  return { step: -1, path: [] };
}

const result = findPlayerToBox(grid, "P", "B");
console.log("P 到 B 步数:", result.step);
console.log("路径:", result.path);

```

## 总结

&emsp;&emsp;通过使用广度优先搜索（BFS）算法，我们可以高效地查找玩家到目标的最短路径。其中 queue.shift()!;这里可以优化，因为如果 queue 数据巨大，会导致性能问题。
