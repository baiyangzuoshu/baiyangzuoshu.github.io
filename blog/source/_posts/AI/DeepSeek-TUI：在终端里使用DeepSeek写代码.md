---
title: "DeepSeek-TUI：在终端里使用 DeepSeek 写代码"
date: 2026-05-14 10:00:00
permalink: "2026/05/14/AI/DeepSeek-TUI在终端里使用DeepSeek写代码/"
categories:
- AI
description: "介绍 DeepSeek-TUI 是什么，以及如何安装、配置 API Key、启动运行和在项目中使用。"
tags:
- DeepSeek
- AI
- 编程
---

&emsp;&emsp;最近我在思考一个更省成本的 AI 编程工作流：让 Codex 负责架构设计、任务拆解和代码审查，让 DeepSeek 负责具体实现。沿着这个思路，我看到了一个项目：[DeepSeek-TUI](https://github.com/Hmbown/DeepSeek-TUI)。它的定位很直接：把 DeepSeek 变成一个运行在终端里的 coding agent。

&emsp;&emsp;简单说，DeepSeek-TUI 不是网页聊天工具，而是一个面向本地代码库的终端助手。你可以在项目目录里启动它，让它读取上下文、解释代码、修改文件、运行命令，并通过终端界面和你交互。对习惯命令行开发的人来说，这种方式比来回复制代码更自然。

### DeepSeek-TUI 是什么

&emsp;&emsp;DeepSeek-TUI 的入口命令是 `deepseek`。根据官方 README，它由两个 Rust 二进制组成：一个是调度命令 `deepseek`，另一个是 TUI 运行时 `deepseek-tui`。npm 包本身更像安装器和包装器，会下载对应平台的预编译二进制，而不是用 Node.js 实现整个 agent。

&emsp;&emsp;它比较适合几类场景：在终端里让 AI 阅读当前项目；让 AI 按要求修改代码；用一次性命令解释某个函数；在自动化脚本里调用 `deepseek exec`；或者在已有工作区里恢复历史会话。它也提供 Plan、Agent、YOLO 等模式，分别对应只读规划、默认交互和自动批准工具调用。

### 安装方式

&emsp;&emsp;如果你已经安装了 Node.js，最简单的方式是 npm：

```bash
npm install -g deepseek-tui
deepseek --version
```

&emsp;&emsp;如果在国内访问 npm 慢，可以使用镜像源：

```bash
npm install -g deepseek-tui --registry=https://registry.npmmirror.com
```

&emsp;&emsp;如果你更喜欢 Rust 工具链，也可以用 Cargo 安装。注意官方说明里两个二进制都需要安装：

```bash
cargo install deepseek-tui-cli --locked
cargo install deepseek-tui --locked
deepseek --version
```

&emsp;&emsp;macOS 用户也可以走 Homebrew：

```bash
brew tap Hmbown/deepseek-tui
brew install deepseek-tui
```

&emsp;&emsp;Windows 用户可以通过 Scoop 安装：

```bash
scoop update
scoop install deepseek-tui
deepseek --version
```

&emsp;&emsp;如果不想依赖包管理器，可以直接到 GitHub Releases 下载预编译文件。官方提供 Linux x64、Linux ARM64、macOS x64、macOS ARM64、Windows x64 等平台构建。还有一种方式是 Docker，适合临时体验或隔离环境：

```bash
docker run --rm -it \
  -e DEEPSEEK_API_KEY \
  -v "$PWD:/workspace" \
  ghcr.io/hmbown/deepseek-tui:latest
```

### 配置 API Key

&emsp;&emsp;第一次启动 `deepseek` 时，它会提示你输入 DeepSeek API Key，并保存到 `~/.deepseek/config.toml`。也可以提前手动设置：

```bash
deepseek auth set --provider deepseek
deepseek auth status
```

&emsp;&emsp;如果你不想写入配置文件，也可以使用环境变量：

```bash
export DEEPSEEK_API_KEY="YOUR_KEY"
deepseek
```

&emsp;&emsp;配置完成后，建议先跑一次诊断：

```bash
deepseek doctor
```

&emsp;&emsp;这个命令会检查配置和连通性。遇到 key 不生效时，也可以用 `deepseek auth status` 看当前凭据来自配置文件、系统 keyring，还是环境变量。

### 基本运行

&emsp;&emsp;最常用的方式是在项目根目录启动交互界面：

```bash
deepseek
```

&emsp;&emsp;如果希望它自动选择模型和思考强度，可以这样启动：

```bash
deepseek --model auto
```

&emsp;&emsp;也可以直接执行一次性任务：

```bash
deepseek "explain this function"
deepseek --model deepseek-v4-flash "summarize this project"
deepseek --model auto "fix this bug"
```

&emsp;&emsp;如果想用于脚本或自动化流程，可以使用非交互模式：

```bash
deepseek exec --auto --output-format stream-json "fix this bug"
```

&emsp;&emsp;已有会话可以继续恢复：

```bash
deepseek sessions
deepseek resume --last
deepseek resume <SESSION_ID>
```

### 使用建议

&emsp;&emsp;DeepSeek-TUI 真正有价值的地方，不只是“能在终端聊天”，而是它能贴近本地项目工作流。但正因为它能改文件、跑命令，使用时更应该给清楚边界。比如让它只修改某几个文件，只实现一个明确功能，先输出方案再动手，最后要求给出测试命令和变更说明。

&emsp;&emsp;我比较推荐的方式是：让 Codex 或自己先做架构拆解，明确模块边界、文件范围和验收标准，然后把具体实现交给 DeepSeek-TUI。完成后再看 git diff，确认它有没有越界修改、重复实现或者破坏原有结构。

&emsp;&emsp;AI 写代码的成本正在下降，但软件维护成本不会自动下降。DeepSeek-TUI 这类工具能提高实现速度，前提是人要把目标、约束和审查做好。把它当成一个终端里的执行工程师，而不是一个可以无限放权的架构负责人，使用体验会更稳定。
