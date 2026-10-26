---
title: "让 AI 真正进入 Cocos Creator：CLI、MCP 与编辑器扩展如何分工"
date: 2026-10-26 10:00:00
permalink: "2026/10/26/AI/cocos-creator-agent-cli-architecture/"
categories:
  - AI
description: "从一次 Cocos Creator Agent CLI 的实际工程拆分出发，讲清 Host、MCP、CLI、Skills、本机桥接与 Creator 扩展各自负责什么。"
tags:
  - Cocos Creator
  - CLI
  - MCP
  - Agent
---

&emsp;&emsp;说到让 AI 帮忙开发 Cocos Creator 项目，很多人会先想到“给编辑器接一个 MCP”。但工具接通只是链路的一段：模型要知道该怎么做，Host 要能发现并调用工具，Creator 还要把命令落实到当前工程，而且结果需要能核对。

&emsp;&emsp;这篇文章里的 Cocos Creator Agent CLI，是我在 CocosAgent 仓库里维护的本机工具。它不是 Cocos 官方的 `cocos` 命令行工具，也不是 Creator 自带的命令。项目把 Host 配置、MCP server、Creator Skills、本机桥接和 Creator 项目扩展放在一条可独立安装的链路里。下面按职责拆开看。

### 先看一条完整链路

![Cocos Creator Agent CLI 从 Host 到 Creator 编辑器的调用链](/images/2026/cocos-agent-cli/architecture.svg)

&emsp;&emsp;用户在 Host 里提出任务。Host 根据上下文选择 Skill 和工具；MCP 把工具描述、参数和回执接进 Host；CLI 负责命令目录、输入校验和桥接；项目扩展则在对应 Creator 实例中执行有编辑器上下文的操作。

### CLI 是产品入口和维护边界

&emsp;&emsp;最关键的设计决定，是把 CLI 做成独立分发的本机工具。它可以直接在终端、脚本或 CI 中运行，也可以被 Codex、Claude Code、Cursor、VS Code 等 Host 调用。这样一来，工具逻辑不需要分别复制到每个 Host 插件里。

&emsp;&emsp;CLI 持有 MCP server、Host 配置适配、Creator Skills 的打包与安装、项目扩展生命周期、本机桥接，以及 Creator 命令合同。Host MCP 调用和直接 CLI 调用会进入同一命令执行层，减少两套接口行为逐渐分叉的机会。

&emsp;&emsp;仓库里的 `plugins/cocos-creator-agent/` 只保留兼容引导 Skill，告诉旧插件用户如何安装和配置 CLI。它不是 MCP server，也不再维护完整的 Creator 工作流 Skills。Creator 原生 CocosAgent 已经停止并从当前产品中移除，不能把历史实现和现在的第三方接入混为一谈。

### MCP 负责连接，不负责领域方法

&emsp;&emsp;CLI 启动 stdio MCP server 后，Host 可以读取工具目录和参数 schema，再把某个调用交给 CLI。MCP 解决的是 Host 与工具之间如何发现、传参和收取结果。它不会自动理解 Creator 的场景序列化规则，也不能单独证明一次编辑已经保存。

&emsp;&emsp;工具目录最终来自 CLI 维护的命令合同。编辑器扩展提供可用能力，CLI 负责路由和校验；若当前 Creator 实例没有连接、版本不符或项目身份无法确认，命令就应该明确失败，而不是假装操作已经完成。

### Creator 扩展负责带着编辑器上下文工作

&emsp;&emsp;场景、Prefab、资源数据库和当前编辑器状态，不只是普通文本文件。CLI 通过只监听本机 loopback 地址的桥接与项目扩展通信，再由 Creator 的 Editor API、AssetDB 等能力处理相应对象。桥接使用本机令牌；它不是把任意网络请求转发给 Creator 的远程服务。

&emsp;&emsp;项目扩展通过显式安装命令加入工程，之后还需要由 Creator 加载扩展。工程文件、场景和 Prefab 的变更仍受目标工程、Creator 实例、操作前置条件和可用读回能力约束。写入工具会被标记为有破坏性的操作；调用方应在提交前检查具体计划和影响范围。

### Skill 负责告诉 Agent 怎么工作

&emsp;&emsp;Skill 是任务流程知识，不是可执行工具。比如用户说“给这个按钮接上点击事件”，Skill 会引导 Agent 先确认 Creator 版本和工程身份、检查工具是否可用，再选择 UI 事件或脚本接线的专项流程。实际读写仍由 Host 文件工具或 Creator-aware 工具完成。

&emsp;&emsp;这套 Skills 按路由入口、领域工作流和专项操作分层。CLI 把通用 Creator Skills 和 2.x 参考资料一并分发；可选 SDK Skills 单独维护，只有涉及相应厂商、产品和平台时才加载。旧式插件不再是这些技能的唯一来源。

&emsp;&emsp;因此，MCP 和 Skill 的职责不能互换：MCP 让工具接进 Host，Skill 让 Agent 知道一类工作该怎么做，CLI 和 Creator 扩展则提供真正执行命令的入口。

### 版本和证据也属于架构

&emsp;&emsp;当前 CLI 接受 Creator 2.4.1 到 2.4.16，并会在未指定路径时按补丁版本从高到低选择安装实例。不过，仓库记录的实机验收主要覆盖 Creator 2.4.15。代码能识别某个版本，不等于每项编辑器行为都已在该版本实测通过。

&emsp;&emsp;因此，结果要分开说：CLI 接受了命令、Creator 扩展读到了对象、Creator 保存了文件、构建通过、游戏运行符合预期，是不同层次的证据。任何一层都不能代替下一层。

&emsp;&emsp;下一篇会从 Node.js 和 Host 配置开始，按实际命令走完安装、配置和连接流程；第三篇再展开 Skills 的路由方式，以及写入命令如何做计划、读回和恢复。

- [第二篇：从安装到接入：Cocos Creator Agent CLI 配置实录](/2026/10/26/AI/cocos-creator-agent-cli-install-guide/)
- [第三篇：Cocos Creator AI 操作，怎样做到计划可查、结果可核对](/2026/10/26/AI/cocos-creator-agent-cli-skills-and-safe-writes/)

参考：

- [Cocos Creator Agent CLI README](https://github.com/baiyangzuoshu/CocosAgent/blob/main/cocos-creator-agent-cli/README.md)
- [第三方 Agent Skill 系统设计](https://github.com/baiyangzuoshu/CocosAgent/blob/main/docs/agent-foundation/cocos-agent-skill-system-creator-2x.md)
- [第三方 Host 接入实现](https://github.com/baiyangzuoshu/CocosAgent/blob/main/docs/agent-foundation/cocos-creator-third-party-integration-mvp-0.1.md)
