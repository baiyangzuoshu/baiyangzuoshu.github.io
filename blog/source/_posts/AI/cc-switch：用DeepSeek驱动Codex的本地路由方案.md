---
title: "cc-switch：用 DeepSeek 驱动 Codex 的本地路由方案"
date: 2026-06-14 10:00:00
permalink: "2026/06/14/AI/cc-switch用DeepSeek驱动Codex/"
categories:
- AI
description: "介绍 cc-switch 如何解决 Codex 与 DeepSeek 等 Chat API 之间的协议不兼容问题，通过本地路由实现协议转换，让 DeepSeek 顺畅驱动 Codex。"
tags:
- DeepSeek
- Codex
- cc-switch
- AI
- 编程
---

&emsp;&emsp;近半年我一直在探索一个低成本高效果的 AI 编程工作流：用 Codex 做架构设计和代码审查，用 DeepSeek 做细节实现。但实际操作时会碰到一个技术障碍——新版 Codex CLI 对接的是 OpenAI Responses API，而 DeepSeek 暴露的是 OpenAI Chat Completions API（也就是 `/chat/completions`）。两种协议的请求体、流式事件和返回结构都不一样，直接往 Codex 配置里填 DeepSeek 的接口地址，轻则模型列表不对，重则请求 404 或 400。

&emsp;&emsp;社区里已经有不少人碰到同样的问题，直到我发现了 [cc-switch](https://github.com/farion1231/cc-switch)——一个专门为 AI 编程工具设计的桌面端管理器，内置了针对 Codex + Chat API 供应商的本地路由方案。本文就是记录这个方案的来龙去脉和配置步骤。

### cc-switch 是什么

&emsp;&emsp;cc-switch 是一个跨平台桌面应用（Windows/macOS/Linux，基于 Tauri 2），定位是 AI 编程工具的"全能管理器"。它支持 Claude Code、Claude Desktop、Codex、Gemini CLI、OpenCode、OpenClaw、Hermes 七个主流工具，在 UI 里统一管理供应商、一键切换模型、同步 MCP 和 Skills。

&emsp;&emsp;对 Codex 用户来说，cc-switch 最核心的功能是**本地路由**：它在 `127.0.0.1:15721` 上拉起一个本地代理，让 Codex 始终连接本地路由（仍以 Responses API 发请求），路由内部判断当前供应商是否是 Chat 格式，如果是就做协议转换。整个过程对 Codex 透明，不需要你修改任何 `config.toml`。

&emsp;&emsp;cc-switch 内置了 50+ 供应商预设，包括 DeepSeek、Kimi、MiniMax、SiliconFlow、阿里百炼、字节豆包等，填个 API Key 就能直接用。GitHub 上目前已有 100k+ star，开源协议宽松。

### 为什么需要本地路由

&emsp;&emsp;问题出在协议层。Codex CLI（新版本）面向的是 OpenAI Responses API，请求路径是 `/responses` 或 `/v1/responses`，而 DeepSeek 的 API 兼容的是传统的 Chat Completions 格式，路径是 `/chat/completions`。两者的请求体结构和 SSE 事件格式完全不同。

&emsp;&emsp;cc-switch 的本地路由方案用一个四步链路解决这个问题：

1. **Codex 接管**：路由启用后，cc-switch 把 Codex 的 live 配置指向 `http://127.0.0.1:15721/v1`，并保持 `wire_api = "responses"`。
2. **供应商标记**：DeepSeek 预设的 `meta.apiFormat = "openai_chat"` 告诉路由——真实上游是 Chat Completions。
3. **请求改写**：路由把 Codex 发来的 `/responses` 路径改写成 `/chat/completions`，同时把 Responses 请求体转换为 Chat 请求体。
4. **响应回译**：上游返回后，路由再把 Chat 的 JSON 或 SSE 流转回 Codex 能理解的 Responses 格式。

&emsp;&emsp;这个方案的精妙之处在于，真正的 DeepSeek API Key 始终保存在 cc-switch 的 Provider 配置里，由本地路由在转发时注入。Codex 的 live 配置里只会看到一个占位符，不用担心 Key 泄露。

### 配置步骤

&emsp;&emsp;前提条件：已安装 cc-switch 并启动、已安装 Codex CLI 并至少运行过一次（确保 `~/.codex/config.toml` 目录结构存在）、有 DeepSeek API Key。

#### 第一步：添加 Codex 供应商

&emsp;&emsp;打开 cc-switch，切换到顶部的 `Codex` 标签，点击右上角加号添加供应商。在弹出的表单中选择内置预设 `DeepSeek`，只需要做两件事：填入你的 DeepSeek API Key，然后保存。

&emsp;&emsp;预设里已经内置了 DeepSeek 的请求基地址 `https://api.deepseek.com`、默认模型（如 `DeepSeek-V4-Flash`）、模型列表和 thinking/reasoning 参数，并且自动开启了"需要本地路由映射"。你不需要手动拼接口路径，协议转换全部交给路由层。

#### 第二步：开启本地路由并接管 Codex

&emsp;&emsp;进入 cc-switch 设置里的"路由"页面，展开"本地路由"。完成两个开关操作：

- 打开"路由总开关"，启动本地服务，默认地址是 `127.0.0.1:15721`。
- 在"路由启用"中打开 `Codex` 开关。如果只想让 Codex 走路由，Claude 和 Gemini 的开关可以保持关闭。

&emsp;&emsp;接管后 cc-switch 会自动修改 Codex 的 live 配置，把认证信息替换为占位符。这一步很快，配置会被原子写入，不会出现写一半崩掉的情况。

#### 第三步：切换供应商并重启 Codex

&emsp;&emsp;回到 Codex 供应商列表，点击 DeepSeek 供应商的"启用"按钮。如果看到"需要路由"标记，说明这个供应商必须在路由运行时使用——没有启动路由的话 cc-switch 会弹出提示。

&emsp;&emsp;切换后建议重启当前 Codex 终端会话。原因是 Codex 进程可能已经读取过旧的 `config.toml`，而 `model_catalog_json` 生成的模型目录通常需要新进程才能刷新。

&emsp;&emsp;进入 Codex 后可以用 `/model` 查看当前加载的模型，应该能看到 DeepSeek 预设的模型名。目前 Codex app 不支持多模型选择，会默认使用配置里的第一个模型。发一个小问题测试一下，观察路由面板的请求数有没有增长，确认请求确实经过了本地路由。

### 其它 Chat 供应商的支持

&emsp;&emsp;cc-switch 对 Chat 格式供应商的支持覆盖很广。DeepSeek、Kimi、MiniMax、SiliconFlow 等主流供应商都有内置预设，按上述流程直接用就行。预设里没覆盖的供应商，选择自定义配置，按对方文档填 API Key、base URL 和模型名，把"API 格式"选为 `OpenAI Chat Completions (需开启路由)` 即可。

&emsp;&emsp;如果你的上游供应商直接支持 OpenAI Responses API（比如 OpenRouter 的某些模型），就不需要打开"需要本地路由映射"，cc-switch 可以 Responses 直连，不走 Chat 转换。

### 常见问题排查

&emsp;&emsp;**Codex 报 404 或找不到 `/responses`**：通常是没有开启 Codex 接管，或者手动把上游 Chat 地址直接写给了 Codex。检查 `~/.codex/config.toml` 是否指向 `http://127.0.0.1:15721/v1`。

&emsp;&emsp;**DeepSeek 上游报 404**：确认当前供应商来自内置预设（不是手动自定义的），并且 Codex 路由已启用。如果是自定义供应商，检查 base URL 是否为服务根地址，而不是带 `/chat/completions` 的完整路径。

&emsp;&emsp;**`/model` 看不到 DeepSeek 模型**：保存供应商后重启 Codex。cc-switch 会生成 `cc-switch-model-catalog.json` 并写入 `model_catalog_json` 路径，但正在运行的 Codex 进程不会热加载模型目录。

&emsp;&emsp;**开了路由但请求走错供应商**：确认三处状态一致：Codex 标签下当前供应商是 DeepSeek、本地路由服务正在运行、"路由启用"里的 Codex 开关已打开。

### 总结

&emsp;&emsp;cc-switch 解决了一个实际且高频的问题：协议不兼容。它的本地路由方案让 Codex 可以用 DeepSeek、Kimi、MiniMax 等 Chat 格式供应商，不需要改 Codex 源码，也不需要手动维护复杂的代理脚本。

&emsp;&emsp;对我自己的工作流意义更大：Codex 负责规划，DeepSeek 负责执行，cc-switch 在中间做无缝的协议转换。三个工具各司其职，一个 GUI 统一管理，配置成本降到最低。

&emsp;&emsp;参考链接：
- [cc-switch GitHub 仓库](https://github.com/farion1231/cc-switch)
- [cc-switch 官网](https://ccswitch.io)
- [Codex + DeepSeek 路由指南（官方文档）](https://github.com/farion1231/cc-switch/blob/main/docs/guides/codex-deepseek-routing-guide-zh.md)
- [DeepSeek API 文档](https://api-docs.deepseek.com/)
