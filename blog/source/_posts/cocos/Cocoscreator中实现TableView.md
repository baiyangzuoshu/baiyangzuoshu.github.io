---
title: Cocoscreator中实现TableView
date: 2025-01-25 09:17:59
categories:
- Cocoscreator
tags:
- tableview
---
![TableView](/images/2025/20250207140231.png)

在游戏开发过程中，列表视图（TableView） 是一种常见且实用的 UI 组件，用于展示大量数据，如排行榜、物品列表、任务列表等。为了确保游戏的性能和用户体验，如何在 Cocos Creator 中高效地实现一个可复用、性能优异的 TableView 成为开发者们关注的重点。本文将基于提供的代码示例，详细解析如何在 Cocos Creator 中实现一个通用的 TableView 组件。

## 1. TableView 组件概述
TableView 是一种用于展示长列表数据的 UI 组件，通过动态复用和虚拟渲染技术，仅渲染可视区域内的列表项，从而大幅提升性能，尤其在处理大量数据时尤为重要。
以下是 TableView 组件的主要功能：
* 数据绑定：将数据源与列表项进行绑定，动态展示内容。
* 点击事件处理：为每个列表项注册点击事件，实现交互功能。
* 动态复用：根据滚动方向和位置复用列表项节点，减少内存和 CPU 开销。
* 性能优化：通过计算可见项数和缓冲区，确保滚动的流畅性和渲染效率。

本文将详细解析两个核心组件：ItemCell 和 TableView，并通过具体的代码示例展示如何实现一个高效的 TableView 组件。

## 2. ItemCell 组件详解
ItemCell 是每个列表项的核心组件，负责绑定数据和处理点击事件。以下是 ItemCell 组件的详细解析：
```
import type { TableViewItem } from "../../Scripts/types";

/**
 * 通用的 ItemCell 组件
 * 负责绑定数据并处理点击事件
 */
class ItemCell extends cc.Component {
    private _itemId = 0;
    private clickCallback!: (itemId: number, node: cc.Node) => void;

    /**
     * 绑定数据的方法，由外部传入具体的绑定逻辑
     * @param index 数据索引
     * @param data 数据对象
     * @param bindCallback 数据绑定回调
     */
    public bindData(index: number, data: unknown, bindCallback: (node: cc.Node, data: unknown) => void) {
        this._itemId = index;
        bindCallback(this.node, data);
    }

    /**
     * 获取当前项的索引
     */
    public getItemId(): number {
        return this._itemId;
    }

    /**
     * 注册点击事件
     * @param callback 点击事件回调
     */
    public registerClick(callback: (itemId: number, node: cc.Node) => void) {
        this.clickCallback = callback;
        const eventNode = this.node.getChildByName("event");
        if (eventNode) {
            eventNode.on("click", this.onClick, this);
        }
    }

    /**
     * 注销点击事件
     */
    public unregisterClick() {
        const eventNode = this.node.getChildByName("event");
        if (eventNode) {
            eventNode.off("click", this.onClick, this);
        }
    }

    /**
     * 点击事件处理
     */
    private onClick() {
        if (this.clickCallback) {
            this.clickCallback(this._itemId, this.node);
        }
    }

    protected onDestroy() {
        this.unregisterClick();
    }
}
```
#### 功能解析
属性
* _itemId: 当前列表项的索引，用于标识该项在数据源中的位置。
* clickCallback: 列表项被点击时的回调函数。
  
方法
* bindData(index, data, bindCallback): 绑定数据到列表项。接收数据索引、数据对象和一个数据绑定回调，由外部传入具体的绑定逻辑。
* getItemId(): 获取当前列表项的索引。
* registerClick(callback): 注册点击事件回调。假设每个列表项有一个名为 "event" 的子节点作为点击区域。
* unregisterClick(): 注销点击事件，防止内存泄漏。
* onClick(): 处理点击事件，触发外部传入的 clickCallback。
* onDestroy(): 生命周期方法，组件销毁时自动注销点击事件。
  
关键点
* 数据绑定：bindData 方法通过外部传入的 bindCallback 将数据绑定到节点上，确保组件的复用性和灵活性。
* 事件管理：registerClick 和 unregisterClick 方法负责管理点击事件的注册和注销，确保事件处理的正确性和内存的有效管理。
* 组件销毁：在组件销毁时自动注销事件，防止内存泄漏。

## TableView 组件详解
TableView 是整个列表的管理组件，负责初始化列表、管理可见项、处理滚动事件和复用列表项。以下是 TableView 组件的详细解析：
```
// scripts/TableView/TableView.ts
/**
 * 通用的 TableView 组件
 * 负责管理 ScrollView 中的列表项复用
 */
export default class TableView extends cc.Component {
    private scrollView!: cc.ScrollView;
    private itemPrefab!: cc.Node;
    private itemHeight = 70;
    private spacingY = 10;
    private datas: unknown[] = [];
    private items: cc.Node[] = [];
    private visibleCount = 0;
    private bufferZone = 0;
    private totalCount = 0;
    private lastContentPosY = 0;

    // 数据绑定回调，由外部传入
    private bindDataCallback!: (node: cc.Node, data: unknown) => void;
    // 点击事件回调，由外部传入
    private clickCallback!: (itemId: number, node: cc.Node) => void;

    /**
     * 初始化 TableView
     * @param v1 TableViewItem 类型对象，包含必要的组件和配置
     * @param datas 数据数组
     * @param cb 回调对象，包含 bindCallback 和 clickCallback
     */
    public initialize(
        v1: TableViewItem,
        datas: unknown[],
        cb: {
            bindCallback: (node: cc.Node, data: unknown) => void,
            clickCallback: (itemId: number, node: cc.Node) => void
        }
    ) {
        this.scrollView = v1.scrollView;
        this.itemPrefab = v1.itemPrefab;
        this.itemHeight = v1.itemHeight;
        this.spacingY = v1.spacingY;
        this.datas = datas;
        this.totalCount = this.datas.length;
        this.bindDataCallback = cb.bindCallback;
        this.clickCallback = cb.clickCallback;

        // 计算可见数量（根据 ScrollView 显示区域高度）
        const viewHeight = this.scrollView.node.height * 4 / 2; // 这行代码需要根据实际情况调整
        this.visibleCount = Math.ceil(viewHeight / (this.itemHeight + this.spacingY)) + 2;
        this.bufferZone = viewHeight / 2;

        // 设置 Content 的总高度
        this.scrollView.content.height = this.totalCount * (this.itemHeight + this.spacingY);

        // 初始化可见的节点池
        for (let i = 0; i < this.visibleCount && i < datas.length; i++) {
            const itemNode = cc.instantiate(this.itemPrefab);
            itemNode.parent = this.scrollView.content;
            itemNode.setPosition(0, -((i + 1) * (this.itemHeight + this.spacingY)));
            const itemCell = itemNode.addComponent(ItemCell);
            itemCell.bindData(i, this.datas[i], this.bindDataCallback);
            itemCell.registerClick(this.clickCallback);
            this.items.push(itemNode);
        }

        this.lastContentPosY = this.scrollView.content.y;
        this.scrollView.scrollToTop();
        // 注册滚动事件
        this.scrollView.node.on('scrolling', this.onScrolling, this);
    }

    public destroyEvent() {
        // 移除滚动事件监听
        if (this.scrollView) {
            this.scrollView.node.off('scrolling', this.onScrolling, this);
        }

        // 移除所有 Item 的点击事件监听
        for (const item of this.items) {
            const itemCell = item.getComponent(ItemCell);
            itemCell.unregisterClick();
        }
    }

    /**
     * 滚动事件处理
     */
    private onScrolling() {
        const currY = this.scrollView.content.y;
        const isScrollingDown = currY > this.lastContentPosY;

        for (const item of this.items) {
            const itemCell = item.getComponent(ItemCell);
            const itemId = itemCell.getItemId();
            const viewPos = this.getPositionInView(item);

            if (isScrollingDown) {
                // 往下滚动，检查是否需要复用到底部
                if (viewPos.y > this.bufferZone) {
                    const newId = itemId + this.items.length;
                    if (newId < this.totalCount) {
                        const newY = item.y - this.items.length * (this.itemHeight + this.spacingY);
                        item.setPosition(0, newY);
                        itemCell.bindData(newId, this.datas[newId], this.bindDataCallback);
                        itemCell.registerClick(this.clickCallback);
                    }
                }
            } else {
                // 往上滚动，检查是否需要复用到顶部
                if (viewPos.y < -this.bufferZone) {
                    const newId = itemId - this.items.length;
                    if (newId >= 0) {
                        const newY = item.y + this.items.length * (this.itemHeight + this.spacingY);
                        item.setPosition(0, newY);
                        itemCell.bindData(newId, this.datas[newId], this.bindDataCallback);
                        itemCell.registerClick(this.clickCallback);
                    }
                }
            }
        }

        this.lastContentPosY = currY;
    }

    /**
     * 获取节点在 ScrollView.view 上的坐标
     * @param item 节点
     */
    private getPositionInView(item: cc.Node): cc.Vec3 {
        const worldPos = item.parent.convertToWorldSpaceAR(item.position);
        const viewPos = this.scrollView.node.convertToNodeSpaceAR(worldPos);
        return viewPos;
    }

    protected onDestroy(): void {
        this.destroyEvent();
    }
}
```
### 功能解析
属性
* scrollView: 引用 ScrollView 组件，用于管理滚动和内容布局。
* itemPrefab: 列表项的预制体，用于动态实例化列表项。
* itemHeight 和 spacingY: 单个列表项的高度和垂直间距，用于计算内容布局。
* datas: 数据源数组，包含所有要展示的数据。
* items: 当前可见的列表项节点数组。
* visibleCount: 根据 ScrollView 的高度和列表项高度计算出的可见列表项数量。
* bufferZone: 缓冲区，用于提前复用列表项，确保滚动的流畅性。
* totalCount: 数据源的总数量。
* lastContentPosY: 记录上一次滚动位置，用于判断滚动方向。
  
回调
* bindDataCallback: 数据绑定回调，由外部传入，用于将数据绑定到列表项。
* clickCallback: 点击事件回调，由外部传入，用于处理列表项的点击事件。
  
方法
* initialize(v1, datas, cb): 初始化 TableView 组件。设置 ScrollView、预制体、列表项高度和间距，计算可见列表项数量，设置内容高度，实例化可见范围内的列表项，并注册滚动事件。
* destroyEvent(): 销毁时移除滚动事件监听器，并注销所有列表项的点击事件，防止内存泄漏。
* onScrolling(): 处理滚动事件，根据滚动方向和位置复用列表项。向下滚动时，复用列表项到底部；向上滚动时，复用列表项到顶部。
* getPositionInView(item): 获取列表项在 ScrollView 视图中的位置，用于判断是否需要复用。
* onDestroy(): 生命周期方法，组件销毁时调用 destroyEvent()。

### 关键点：
* 动态复用：通过计算可见列表项数量和缓冲区，动态复用列表项节点，避免大量节点的创建和销毁。
* 事件管理：合理注册和注销滚动事件和点击事件，确保组件的正确性和内存管理。
* 数据绑定：通过外部传入的 bindDataCallback 实现数据与 UI 的绑定，增强组件的复用性和灵活性。

## 4. 使用指南
```
// 初始化 TableView
const tableView = this.myScrollView.node.addComponent(TableView);
// 定义数据绑定回调
const bindCallback = this.bindRankItem.bind(this);
// 定义点击事件回调
const clickCallback = this.onTableViewItemClick.bind(this);

// 注入依赖
tableView.initialize({
    scrollView: this.myScrollView,
    itemPrefab: this.cloneItem,
    itemHeight: 70,
    spacingY: 10
}, this.itemArr, {
    bindCallback: bindCallback,
    clickCallback: clickCallback
});
```
### 参数说明：
    #### 配置对象：
	* scrollView: 引用的 ScrollView 组件。
	* itemPrefab: 列表项的预制体。
	* itemHeight: 单个列表项的高度。
	* spacingY: 列表项之间的垂直间距。
	* 数据数组：itemArr 包含所有要展示的数据。
  
	* 回调对象：
	* bindCallback: 数据绑定回调函数。
	* clickCallback: 点击事件回调函数。

通过以上步骤，TableView 组件将根据数据源动态生成和复用列表项，实现高效的列表展示。



