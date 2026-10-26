---
title: "从安装到接入：Cocos Creator Agent CLI 配置实录"
date: 2026-10-26 10:20:00
permalink: "2026/10/26/AI/cocos-creator-agent-cli-install-guide/"
categories:
  - AI
description: "用一条可复核的流程安装 Cocos Creator Agent CLI、配置 Host、安装 Skills，并连接 Creator 项目扩展。"
tags:
  - Cocos Creator
  - CLI
  - MCP
  - 安装指南
---

&emsp;&emsp;上一篇介绍了 Cocos Creator Agent CLI 的组成。这一篇直接走安装流程：准备 Node.js，安装 CLI，配置一个 AI Host，再把 CLI 项目扩展接入 Creator 工程。

&emsp;&emsp;先说明范围：这里的 `cocos-creator-agent` 是 CocosAgent 项目提供的 Creator 2.x Agent CLI，不是 Cocos 官方 `cocos` 命令行工具。CLI 当前接受 Creator 2.4.1–2.4.16；项目现有实机验收证据主要来自 2.4.15。开始前仍要核对自己工程的精确 Creator 版本。

![Cocos Creator Agent CLI 的环境准备、Host 配置与 Creator 工程接入流程](/images/2026/cocos-agent-cli/install-guide.svg)

### 1. 准备环境并选择发布版本

&emsp;&emsp;CLI 需要 Node.js 20 或更新版本。它通过 GitHub Release 的版本化 tarball 安装，不是从 npm 公共 registry 安装。下面的版本号以仓库 README 当前写明的 1.0.2 为例：

~~~sh
VERSION=1.0.2
npm install --global "https://github.com/baiyangzuoshu/CocosAgent/releases/download/cocos-creator-agent-cli-v${VERSION}/cocos-creator-agent-cli-v${VERSION}.tgz"
~~~

&emsp;&emsp;版本需要跟随 Release 更新。写这篇时，工作区里的 `package.json` 已经是 1.0.3，而 README 所写的最新发布版本仍是 1.0.2。源码版本号不能证明对应的 Release 资产已经发布；安装前应以 GitHub Releases 页面为准，并在文章正式发布前复核命令中的版本。

&emsp;&emsp;安装后先确认命令能运行：

~~~sh
cocos-creator-agent version --format json
cocos-creator-agent doctor
cocos-creator-agent creator installations
~~~

&emsp;&emsp;`doctor` 用来检查本机 CLI 环境，`creator installations` 则列出 CLI 能发现的 Creator 安装。若要排查某个工程，还可以提供工程路径：

~~~sh
cocos-creator-agent doctor --project-root /absolute/path/to/your-project
~~~

### 2. 配置 Host 的 MCP 和 Skills

&emsp;&emsp;以 Codex 为例，先预览 MCP 配置，再写入配置并安装 Creator Skills：

~~~sh
cocos-creator-agent mcp configure codex --dry-run
cocos-creator-agent mcp configure codex
cocos-creator-agent skill install codex
cocos-creator-agent mcp status codex
~~~

&emsp;&emsp;配置 MCP 后重启 Host，让它重新加载工具目录。Skills 安装到 Host 自己的 Skill 目录；MCP 配置则登记由 CLI 启动的 stdio server。二者都完成后，Host 才同时有 Creator 工作方法和 Creator 工具入口。

&emsp;&emsp;Claude Code 使用 `claude-code` 这个 client 名称；Cursor 和 VS Code 走各自的 JSON MCP 配置。可以先查看当前版本支持的目标：

~~~sh
cocos-creator-agent mcp list
cocos-creator-agent skill show --list
~~~

&emsp;&emsp;CLI 升级后，如果需要刷新已经安装的 Skill，可以显式运行 `skill refresh`，例如 `cocos-creator-agent skill refresh codex`。Host 的实际能力仍取决于它是否重新加载了配置，以及当前会话是否暴露了相应 MCP 工具。

### 3. 把项目扩展安装到目标工程

&emsp;&emsp;CLI 可以只作为 Skills 和终端工具使用；要读写活动场景或调用 Creator 编辑器能力，还需要把扩展接到具体工程。先在 Cocos Dashboard 确认项目名称、绝对路径、Creator 版本和打开状态，再对准确的项目目录执行安装：

~~~sh
cocos-creator-agent extension install --project-root /absolute/path/to/your-project
~~~

&emsp;&emsp;安装命令会把扩展放进工程的 `packages/` 目录。之后使用 CLI 打开目标工程，并检查扩展状态：

~~~sh
cocos-creator-agent project open --project-root /absolute/path/to/your-project --timeout-ms 120000
cocos-creator-agent extension status --project-root /absolute/path/to/your-project
~~~

&emsp;&emsp;打开后仍要在 Creator 窗口核对版本和工程路径。CLI 的 `project open` 会等待扩展握手与工程信息往返；只有编辑器端实际返回了匹配的工程身份，`editorReady` 才代表连接就绪。遇到超时，应先检查 Creator 是否正在加载、扩展是否启用，以及打开的路径是否正确。

&emsp;&emsp;Host 连接 Creator 后，可以看 CLI 的共享命令目录：

~~~sh
cocos-creator-agent catalog --format json
~~~

&emsp;&emsp;MCP 目录和直接 CLI 调用共用命令合同，但哪些工具可调用还受当前 Creator 实例、扩展版本和任务流程约束。文章第一篇解释了这些组件如何分工；下一篇会讲 Skill 路由与写入操作的核验边界。

### 常见问题

- **CLI 命令不存在**：检查 Node.js 全局安装目录是否在 `PATH` 中，再运行 `cocos-creator-agent version --format json`。
- **Host 看不到工具**：确认运行过 `mcp configure`，随后完整重启 Host，并检查 `mcp status <client>`。
- **Skill 没出现**：确认 `skill install` 使用了目标 Host 名称，再查看 Host 的 Skill 目录或运行 `skill show --list`。
- **Creator 工程没有编辑器工具**：检查扩展是否安装到正确工程、Creator 是否加载扩展、实例版本是否受支持，并查看 `extension status` 与 `doctor` 的具体输出。
- **版本能选中但行为不符合预期**：区分“版本被 CLI 接受”和“功能在该补丁版实机验收通过”。当前项目的实机证据不能自动外推到所有 2.4.x。

&emsp;&emsp;完整命令、能力范围和最新发布信息以项目 README 为准。版本、Host 和工程路径最好写进自己的接入记录，排查问题时才知道当前连接的究竟是哪一个 CLI、Creator 和工程。

- [第一篇：让 AI 真正进入 Cocos Creator：CLI、MCP 与编辑器扩展如何分工](/2026/10/26/AI/cocos-creator-agent-cli-architecture/)
- [第三篇：Cocos Creator AI 操作，怎样做到计划可查、结果可核对](/2026/10/26/AI/cocos-creator-agent-cli-skills-and-safe-writes/)

参考：

- [Cocos Creator Agent CLI 安装与命令说明](https://github.com/baiyangzuoshu/CocosAgent/blob/main/cocos-creator-agent-cli/README.md)
- [GitHub Releases](https://github.com/baiyangzuoshu/CocosAgent/releases)
