---
title: "Cocos Creator CLI 的空中楼阁：AI 写出了功能，工程验证还要继续"
date: 2026-10-31 10:00:00
permalink: "2026/10/31/AI/cocos-creator-cli-ai-foundations-and-iteration/"
categories:
  - AI
description: "结合 Cocos Creator Agent CLI 的实践，谈 AI 辅助实现、借鉴 Unity CLI 与工程理论、自动化测试和持续迭代之间的关系。"
tags:
  - Cocos Creator
  - CLI
  - AI
  - 工程实践
---

&emsp;&emsp;这段时间围绕 Cocos Creator Agent CLI 做了不少实践。它能安装、能接入 Host，也能通过命令操作 Creator 工程；但如果问我整体体验是否已经达到预期，我的答案是不尽如人意。

&emsp;&emsp;这里说的 Cocos CLI，指的是我参与实践的 Cocos Creator Agent CLI，不是 Cocos 官方的 `cocos` 命令行工具。回头看这套东西，我越来越确定一件事：AI 能把功能很快写出来，却不能替代扎实的工程理论。没有对引擎、编辑器和工具链的理解，AI 功能很容易只搭起一个看上去完整的架子。

### 能运行，不代表架构已经站稳

&emsp;&emsp;在我的实践里，这套 Cocos CLI 基本由 AI 生成实现，架构思路也借鉴了 Unity CLI，例如独立安装、MCP server 和 Skill 分发。这让我觉得它有点像一座空中楼阁：产品形状搭起来了，根基却未必来自 Cocos Creator 自己的工程问题。借鉴成熟方案本身没有问题，关键还是要追问：我们有没有把它真正落到 Cocos Creator 自己的工作模型上？

&emsp;&emsp;在我的实践判断里，如果只把一套外部工具的产品形状搬过来，再让 AI 按需求补齐命令，最后很容易得到一个“看上去像产品”的东西。它有入口、有命令、有回执，演示时也能跑通；可一旦遇到真实工程里的资源导入、场景与 Prefab 保存、Creator 版本差异、运行时行为和异常恢复，底下的模型是否可靠就会暴露出来。

&emsp;&emsp;Cocos Creator 不是一组可以随意改写的 JSON 文件。资源身份、AssetDB、`.meta` 和 UUID，场景序列化与编辑器保存，预览运行时和目标设备，都有各自的规则。要让 CLI 真正成为 Cocos 工具，架构就得从这些领域事实出发。否则所谓“自己的东西”只是在命令名称和界面上换了外壳，核心行为还没有经过足够的领域打磨。

### AI 会补代码，不能替你补齐理论

&emsp;&emsp;AI 很擅长根据已有接口生成代码、铺开重复实现、补齐常见分支。但它不会因为代码写得多，就自动知道某个 Creator 保存接口是否真的完成落盘，也不会因为一次命令返回成功，就知道场景是否能重新打开、预览是否运行正确。

&emsp;&emsp;这些判断来自基础理论和工程经验：知道资源数据库如何管理身份，理解编辑器进程与游戏运行时的边界，区分命令回执、文件读回、构建结果和实际运行效果，也知道一次失败后哪些操作可以安全重试、哪些必须停下来人工核对。没有这些概念，AI 生成的实现即使结构漂亮，也可能只是把不确定性包装成了一个成功状态。

&emsp;&emsp;所以我不认为“代码是 AI 写的”就天然意味着它不好。问题在于，如果开发者自己也没有能力解释设计依据、判断证据强弱和发现边界条件，那整个项目就会依赖模型当时猜得准不准。这样的东西往往能勉强使用，却很难让人放心地长期依赖。

### 测试不是收尾，是设计的一部分

&emsp;&emsp;AI 做出来的 CLI 仍然要靠自己不断测试、不断迭代。测试也不能只停留在命令返回 0 或一个示例工程成功运行。CLI 的输入校验、Creator 实例身份、AssetDB 读写、场景保存、编译诊断、预览交互和错误恢复，应该分别有清楚的检查方式。

&emsp;&emsp;这个项目目前通过工程测试清单组织 Node、Creator Provider、Editor 脚本和 Preview 等不同测试适配器，并生成结构化报告。这些测试能帮助我们重复检查，也能把失败保留下来；但它们不是 Creator 官方内建的完整单元测试体系，更不能互相替代。Node 测试通过，不代表编辑器里的场景已保存；Web 预览断言通过，也不代表目标手机上的触控和布局已经验收。

&emsp;&emsp;实际迭代应该形成一条清楚的链路：先明确要验证的行为和证据，再实现最小改动；随后在对应的 Creator 工程和版本里运行测试，查看报告、日志和文件读回；失败时先定位原因，再修复并重跑受影响的检查。每一轮都要回答“这次改动证明了什么，还有什么没有证明”，而不是只留下一个绿色结果。

### 从勉强可用，走向可信赖

&emsp;&emsp;以目前的实践来看，我更愿意把这套 CLI 看成一项仍在打磨中的工程，而不是已经成熟的 AI 开发产品。它能做什么，要看具体命令和对应证据；源码实现、自动化测试、Creator 实机验收和目标运行时结果，必须分开描述。仓库里的实机记录也主要覆盖 Creator 2.4.15，不能因为 CLI 接受其他 2.4 补丁版本，就把验收范围一并扩大。

&emsp;&emsp;这不是否定 AI 的价值。AI 确实能缩短实现周期，让一个人更快搭起 CLI、MCP 和自动化测试的骨架。但基础理论决定我们搭的骨架是否符合引擎，测试决定功能是否真的成立，反复迭代则把“勉强可以用”一点点推向“可解释、可复现、可依赖”。

&emsp;&emsp;如果没有扎实的基础理论，AI 功能很难做好；如果做完之后不持续测试和修复，它也只能停留在“好像能用”。这大概是我这段 Cocos CLI 实践里最直接的体会：AI 可以参与建造，但工程质量仍要靠理解、验证和一轮轮迭代来负责。

参考：

- [Cocos Creator Agent CLI README](https://github.com/baiyangzuoshu/CocosAgent/blob/main/cocos-creator-agent-cli/README.md)
- [第三方 Host 接入实现：Unity CLI 参考与 Cocos 领域适配](https://github.com/baiyangzuoshu/CocosAgent/blob/main/docs/agent-foundation/cocos-creator-third-party-integration-mvp-0.1.md)
- [Creator 项目测试运行器说明](https://github.com/baiyangzuoshu/CocosAgent/blob/main/cocos-creator-agent-cli/references/2x/14-project-test-runner.md)
- [Creator 2.x Skill 系统与版本验收边界](https://github.com/baiyangzuoshu/CocosAgent/blob/main/docs/agent-foundation/cocos-agent-skill-system-creator-2x.md)
