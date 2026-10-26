---
title: "Cocos Creator AI 操作，怎样做到计划可查、结果可核对"
date: 2026-10-26 10:40:00
permalink: "2026/10/26/AI/cocos-creator-agent-cli-skills-and-safe-writes/"
categories:
  - AI
description: "从 Creator Skills 的分层路由，到场景写入的 plan、commit、reconcile，说明 AI 工具如何把操作范围和结果证据讲清楚。"
tags:
  - Cocos Creator
  - Agent
  - Skill
  - MCP
  - 工程实践
---

&emsp;&emsp;AI 能调用 Creator 工具，不代表它自然知道应该选哪一个，也不代表调用成功就意味着工程已经正确保存。把编辑器接进 Host 之后，真正决定可靠性的，是操作前能不能看清范围、操作后能不能读回，以及最后有没有准确说明证据到哪一步。

&emsp;&emsp;Cocos Creator Agent CLI 把这件事拆成两层：Skills 指导 Agent 如何处理任务；CLI 与 Creator 扩展执行有明确合同的命令。下面先看 Skills 怎样路由，再看一次写入应当如何收尾。

### Skill 是流程说明，不是执行权限

&emsp;&emsp;仓库中的 Creator Skill 从通用入口开始。`cocos-agent` 先识别工程和 Creator 版本、盘点 Host 真正可用的工具，再把任务路由到一个匹配的领域工作流，例如 UI、Prefab、脚本、运行时或构建。领域 Skill 再指向必要的专项说明，避免每个任务一开始就把整套知识加载进上下文。

&emsp;&emsp;项目文档把核心 Creator 工作流拆为 51 项：一个总入口、11 个领域路由和 39 个专项 Skill。另有 CLI 使用引导；广告、内购、联网和语音等厂商 SDK 流程放在独立的可选包中。这样做的目的，是把每次任务真正用得到的工作步骤带进上下文，而不是把所有领域的规则一次性铺开。

&emsp;&emsp;Skill 不会创建 MCP 工具，也不会因为写了某个操作步骤就获得 Creator 权限。实际工具必须由 Host 当前会话和 CLI 暴露；涉及场景、Prefab、导入设置或运行状态时，还要确认 Creator-aware 工具是否连接。没有对应工具时，Skill 应该说清楚哪些状态无法安全验证，并给出手动编辑器步骤。

### 写入要从计划开始

&emsp;&emsp;以改名场景节点为例，Agent 首先需要读出当前活动场景和目标节点身份，然后生成一个绑定当前前置状态的计划：

~~~sh
cocos-creator-agent call --instance <instance-id> --command creator.scene.node.rename.plan --input '{"sceneUuid":"<scene-uuid>","nodeUuid":"<node-uuid>","newName":"StartButton"}'
~~~

&emsp;&emsp;计划返回操作标识和哈希。调用方应检查目标工程、节点、拟议值和计划摘要，确认没有改错对象后，再显式提交：

~~~sh
cocos-creator-agent call --instance <instance-id> --command creator.scene.node.rename.commit --input '{"operationId":"<operation-id>","planHash":"<plan-sha256>"}'
cocos-creator-agent call --instance <instance-id> --command creator.scene.node.rename.reconcile --input '{"operationId":"<operation-id>"}'
~~~

&emsp;&emsp;要注意，`commit` 就是写入边界：调用时会立即执行，Creator 不会再弹一个额外的批准框。MCP 会把写入或控制工具标记为有破坏性的操作，但标记不等于用户已经检查了计划。Agent 应在提交前说明具体修改，调用方则要按 Host 的审批策略处理。

&emsp;&emsp;如果提交遇到超时或连接中断，下一步是用原操作标识执行 `reconcile`，核对操作状态和当前结果。恢复检查不应悄悄重放写入。CLI 也不会在结果不确定时自动重试，避免一次网络或编辑器超时变成重复副作用。

### 读回之后再描述结果

&emsp;&emsp;不同命令能证明的事情不同。对已支持的场景节点写入，CLI 会重新读取对应 AssetDB 文件并比对计划状态；Prefab 与脚本等操作也各自有不同的身份检查、哈希和读回合同。不能把“commit 返回成功”当成所有修改都已持久化，更不能把一次源文件检查说成目标平台运行通过。

&emsp;&emsp;还要区分源码、Creator 编辑器、构建和运行时证据。扩展连接成功，只能说明连接已建立；Creator 保存回读只说明对应文件状态符合预期；构建通过也不等于目标设备上的交互已经验证。`creator.editor.eval` 可以执行指定脚本，但它的返回值不能证明脚本造成的任意效果都已保存，reconcile 也不会重新执行脚本。

&emsp;&emsp;版本同样是证据边界的一部分。CLI 接受 Creator 2.4.1–2.4.16，不等于所有补丁版的编辑器行为都通过验收；仓库的真实编辑器验收目前主要覆盖 Creator 2.4.15。引用引擎或序列化细节时，要先确认目标补丁版，不能把某个版本的实测结论扩大成 2.4.x 的保证。

### 一次可靠的 Agent 操作可以这样复盘

1. **确认身份**：核对工程绝对路径、Creator 补丁版、活动实例和目标节点。
2. **检查工具**：确认当前 Host 暴露了所需命令，读清该命令的合同和限制。
3. **生成计划**：明确对象、前置状态、改动值和计划摘要。
4. **审阅再提交**：在 commit 之前说明实际副作用；commit 调用后视为已经执行。
5. **读取结果**：用原操作标识 reconcile，并依据该命令提供的文件或编辑器读回来判断结果。
6. **分层报告**：分别说明源码、Creator、构建和运行时证据，不把尚未验证的部分补成成功结论。

&emsp;&emsp;这套流程不会让所有编辑器操作都没有风险，也不会替代开发者对场景内容的判断。它能做的是把“准备改什么”“何时实际写入”“哪些状态已经读回”拆成清楚的步骤，方便人和 Agent 共同检查。

&emsp;&emsp;三篇文章到这里形成一条线：第一篇讲 CLI、MCP、Host 和 Creator 扩展的分工；第二篇按命令完成安装和接入；这一篇解释 Skill 路由以及写入证据边界。它们描述的是当前 CocosAgent 仓库的实现方式，能力和版本信息仍应以 CLI 命令合同及对应验收记录为准。

- [第一篇：让 AI 真正进入 Cocos Creator：CLI、MCP 与编辑器扩展如何分工](/2026/10/26/AI/cocos-creator-agent-cli-architecture/)
- [第二篇：从安装到接入：Cocos Creator Agent CLI 配置实录](/2026/10/26/AI/cocos-creator-agent-cli-install-guide/)

参考：

- [Cocos Creator Agent CLI README](https://github.com/baiyangzuoshu/CocosAgent/blob/main/cocos-creator-agent-cli/README.md)
- [Creator 2.4.x 第三方 Agent Skill 系统](https://github.com/baiyangzuoshu/CocosAgent/blob/main/docs/agent-foundation/cocos-agent-skill-system-creator-2x.md)
- [Creator 第三方 Host 接入实现](https://github.com/baiyangzuoshu/CocosAgent/blob/main/docs/agent-foundation/cocos-creator-third-party-integration-mvp-0.1.md)
