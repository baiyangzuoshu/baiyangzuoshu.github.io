---
title: "DeepSeek-Reasonix：终端版与桌面版安装指南"
date: 2026-06-20 10:00:00
permalink: "2026/06/20/AI/DeepSeek-Reasonix终端版与桌面版安装指南/"
categories:
- AI
description: "根据 DeepSeek-Reasonix 中文 README 和官网安装页，整理 Reasonix 终端版与桌面版的安装、初始化和使用方式。"
tags:
- DeepSeek
- Reasonix
- AI
- 编程
---

&emsp;&emsp;最近看了 [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix/blob/main-v2/README.zh-CN.md) 的中文 README。它的定位很明确：一个面向终端的 DeepSeek 原生 AI coding agent。和普通聊天工具不同，Reasonix 更强调长会话、低成本和项目内持续工作。它围绕 DeepSeek 的 prefix cache 做了设计，让长时间会话可以复用大量上下文，从而降低输入 token 成本。

&emsp;&emsp;Reasonix 现在主要有两种使用方式：一种是终端版，也就是 CLI；另一种是桌面版，适合不想长期待在命令行里的用户。两者使用的是同一套核心能力，只是入口不同。

### 版本选择

&emsp;&emsp;Reasonix 1.0 之后已经改成 Go 重写版，旧的 0.x TypeScript 版本属于 legacy。这里需要特别注意：官网安装区提示，`latest` 标签仍可能指向旧的 0.53 版本，因此如果用 npm 安装，建议明确使用 `@next`，避免装到旧版。

```bash
npm i -g reasonix@next
```

&emsp;&emsp;安装后可以检查版本：

```bash
reasonix --version
```

### 终端版安装

&emsp;&emsp;终端版最适合在项目目录、远程服务器、WSL 或 SSH 环境中使用。它不依赖 IDE，直接把终端当成工作面板。常见安装方式有三种。

&emsp;&emsp;第一种是 npm，全平台可用：

```bash
npm i -g reasonix@next
```

&emsp;&emsp;第二种是 Homebrew，适合 macOS，也支持 Linux：

```bash
brew install esengine/reasonix/reasonix
```

&emsp;&emsp;第三种是 GitHub Releases。官方提供 darwin、linux、windows，以及 amd64、arm64 的预构建包。你可以直接下载对应系统的压缩包，解压后把 `reasonix` 放到 `PATH` 里。

&emsp;&emsp;如果你想从源码构建，需要 Go 环境。仓库提供了 Makefile：

```bash
make build
make cross
```

&emsp;&emsp;其中 `make build` 会生成本机二进制，`make cross` 会交叉编译多平台版本。

### 终端版初始化

&emsp;&emsp;安装完成后，进入项目目录，先运行初始化向导：

```bash
reasonix setup
```

&emsp;&emsp;它会生成或更新 `reasonix.toml`，用于声明模型、provider、工具和插件等配置。DeepSeek API Key 可以通过环境变量提供：

```bash
export DEEPSEEK_API_KEY=sk-...
```

&emsp;&emsp;也可以让 setup 引导你把密钥保存到系统凭据存储中。最小配置大致如下：

```toml
default_model = "deepseek-flash"

[[providers]]
name        = "deepseek-flash"
kind        = "openai"
base_url    = "https://api.deepseek.com"
model       = "deepseek-v4-flash"
api_key_env = "DEEPSEEK_API_KEY"
```

&emsp;&emsp;然后在项目根目录启动：

```bash
reasonix
```

&emsp;&emsp;首次进入项目后，可以执行 `/init` 生成 `AGENTS.md`，作为项目记忆。也可以直接用一次性命令：

```bash
reasonix run "implement the TODOs in main.go"
reasonix run --model mimo-pro "add unit tests for this function"
echo "explain this code" | reasonix run
```

### 桌面版安装

&emsp;&emsp;如果你不想完全在终端里工作，可以安装 Reasonix 桌面版。官网提供 macOS、Windows、Linux 三类安装包。

&emsp;&emsp;macOS 用户可以下载 Universal DMG，支持 Apple Silicon 和 Intel。也可以分别下载 Apple Silicon zip 或 Intel zip。安装方式和普通 macOS 应用一样，打开 DMG 后把 Reasonix 拖到 `/Applications`。

&emsp;&emsp;如果 macOS 提示应用无法打开，且你确认文件来自官方渠道并已放入 `/Applications`，可以退出 Reasonix 后执行：

```bash
sudo xattr -rd com.apple.quarantine /Applications/Reasonix.app
```

&emsp;&emsp;Windows 用户可以下载 Installer，支持 Windows 10+，并提供 x64 和 ARM64 版本。如果不想安装，也可以使用 portable zip。

&emsp;&emsp;Linux 用户可以下载 Debian/Ubuntu 的 `.deb` 包，也可以使用通用 `tar.gz`。例如 `.deb` 包可以这样安装：

```bash
sudo dpkg -i reasonix*.deb
```

&emsp;&emsp;桌面版内置自动更新，并且和 CLI 使用同一套 Reasonix 引擎。它更适合本机长期运行、查看会话、管理任务；终端版则更适合项目目录、脚本、服务器和 SSH 场景。

### 我会怎么用

&emsp;&emsp;如果只是体验 Reasonix，我建议先装终端版。原因很简单：CLI 最贴近它的设计目标。进入项目目录，`reasonix setup`，配置 API Key，再启动 `reasonix`，整个流程很直接。

&emsp;&emsp;如果你已经确定要长期使用，可以再装桌面版。桌面版的优势是入口更稳定，不用每次打开终端找会话，也更适合把 Reasonix 当成常驻工具。尤其是本地多个项目同时处理时，桌面版会更舒服。

&emsp;&emsp;不过不管用哪一种安装方式，最重要的还是先把边界讲清楚。Reasonix 是 coding agent，不是普通问答机器人。让它改代码前，最好说明目标、允许修改的文件、测试命令和验收标准。工具越强，越需要人把方向定准。

参考：

- [DeepSeek-Reasonix 中文 README](https://github.com/esengine/DeepSeek-Reasonix/blob/main-v2/README.zh-CN.md)
- [Reasonix 官网安装页](https://reasonix.io/)
- [Reasonix GitHub Releases](https://github.com/esengine/DeepSeek-Reasonix/releases)
