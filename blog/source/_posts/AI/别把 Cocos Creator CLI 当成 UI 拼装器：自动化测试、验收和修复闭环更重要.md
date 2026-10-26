---
title: "别把 Cocos Creator CLI 当成 UI 拼装器：自动化测试、验收和修复闭环更重要"
date: 2026-10-26 21:00:00
permalink: "2026/10/26/AI/cocos-creator-cli-testing-acceptance-loop/"
categories:
  - AI
description: "Cocos Creator CLI 可以创建和修改 UI，但更大的价值是把测试、验收、问题定位与修复后的回归检查连成闭环。"
tags:
  - Cocos Creator
  - CLI
  - 自动化测试
  - UI
  - 验收
---

&emsp;&emsp;如果把 Cocos Creator CLI 当成一个“让 AI 拼几个节点、按钮和 Label”的工具，我觉得有些用错了重点。不是因为它不能拼 UI。场景组合、节点和组件操作本来就是 CLI 的能力。问题在于，只把画出一张界面当成终点，会错过它更有价值的部分：让修改可以被测试、被验收，失败后还能带着证据继续修复。

![Cocos Creator CLI 将 UI 修改、自动测试、失败诊断和回归验收连成闭环](/images/2026/cocos-agent-cli/testing-acceptance-loop.svg)

### 拼出界面只是第一步

&emsp;&emsp;AI 可以按要求创建节点、挂组件、设置 Widget 和绑定按钮事件。这对重复度高的面板骨架、设置页或临时测试界面很有帮助。CLI 的计划与提交接口，也能把具体改动绑定到目标工程和对象上。

&emsp;&emsp;但节点出现在层级里，不代表界面就验收通过。按钮可能没有响应，锚点可能在不同分辨率下跑位，滚动内容可能溢出，脚本也可能在预览时抛错。能生成 UI 解决的是“怎么搭出来”；进入项目后，更多时间花在“它是否真的按预期工作”。

&emsp;&emsp;所以我不会用“AI 能不能自动画出面板”来衡量 CLI 的价值。更关键的问题是：每次调整后，能不能用同一套检查快速确认效果？失败时，能不能指出是哪条断言、哪个运行时错误或哪段布局出了问题？

### 测试计划把不同验证层接到一起

&emsp;&emsp;Cocos Creator 2.4.15 没有一个内建的 Unity 风格测试命令，可以直接覆盖编辑器和运行时。这个项目的 CLI 提供了自己的项目测试运行器，通过工程内的 .cocos-agent/tests.json 声明测试套件，再按套件类型调用不同适配器。

&emsp;&emsp;适配器分工很重要。Node 套件适合测普通 JavaScript 逻辑，但它没有 Creator 场景和引擎全局，不能用来证明 UI 在编辑器里能工作。Creator Provider 或 Editor 脚本适合检查编辑器上下文；Preview 套件则绑定到指定 Creator 工程、场景和 Web 预览会话，可以执行有限交互，再断言节点、组件字段、Console 状态或 UI 几何。

&emsp;&emsp;先看测试计划，再按套件运行，流程大致是这样：

~~~sh
cocos-creator-agent creator test --project-root /absolute/path/to/project --list

cocos-creator-agent creator test --project-root /absolute/path/to/project \
  --suite settings-panel \
  --instance <instance-id> \
  --session <preview-session-id>
~~~

&emsp;&emsp;测试报告会分别保存为 JSON 和 JUnit XML，记录套件、用例、身份、结果和运行回执。失败用例可以在工程路径和测试清单哈希仍匹配时重新运行；文件变化后，creator watch --affected 还能只重跑依赖到这些文件的测试计划。

### 把失败变成可处理的证据

&emsp;&emsp;一次 UI 验收可以先从最小闭环开始：打开指定场景、模拟一次按钮操作、确认目标节点或组件状态发生变化，并断言 Console 没有错误。布局问题则可以对节点位置、尺寸或 Widget/Layout 几何增加数值断言。截图也可以留给开发者或 Agent 检查实际视觉效果，再决定要不要调整间距、锚点或层级。

&emsp;&emsp;如果用例失败，下一步不是盲目再生成一遍 UI，而是先读报告、Console 和截图，区分是脚本逻辑、事件绑定、节点路径、布局数值还是场景身份的问题。确认原因后，Agent 再通过适合的 CLI 操作修复脚本或场景，随后用 rerun-failed 或受影响套件复查。

&emsp;&emsp;这就是我说的“修复闭环”：CLI 提供稳定的操作入口、可重复执行的检查和结构化回执；Agent 或开发者负责解释失败、选择正确改动，再让 CLI 验证修复是否有效。它并不是一个不需要人判断的自动自愈按钮。

### 自动化要有边界，验收也要分层

&emsp;&emsp;自动测试不会凭空知道产品期望。项目必须维护有意义的测试清单、稳定的用例 ID、依赖路径和断言。没有断言，测试跑完也回答不了“什么才算对”；断言过于脆弱，又会让正常的布局调整不断误报。

&emsp;&emsp;不同测试适配器也不能互相代替。Node 测试通过，不代表 Creator 已完成资源导入；compile-finished 事件出现，不代表构建成功；预览断言通过，也不代表设备安全区、原生键盘、触摸惯性等行为已验证。CLI 可以采集 Builder 事件、脚本导入问题和编辑器 Console，但最终仍要按证据说明检查到了哪一层。

&emsp;&emsp;另外，Editor 和 Preview 测试脚本会在 Creator 或正在运行的游戏页面里执行，并不是沙箱。预览用例可能改变活动场景状态；超时或不确定回执需要人工检查，不应该自动重放。对场景和 Prefab 的写入，也要遵循对应的计划、提交、读回与恢复合同。

&emsp;&emsp;当前项目接受多个 Creator 2.4 补丁版，但实机验证主要覆盖 2.4.15。Web 预览的结果也不能被写成目标设备验收。测试报告应标明工程、Creator 版本、测试类型和运行环境，而不是只留下一个绿色的“通过”。

### 真正的价值是可重复的迭代

&emsp;&emsp;用 CLI 创建 UI 当然有用，尤其适合搭结构清楚、约束明确的界面。但如果停在“节点已经生成”，这还只是一段自动化操作。把测试计划、预览交互、布局断言、Console 诊断和失败回归接起来，AI 才有机会在每一轮修改后知道自己是否真的修好了问题。

&emsp;&emsp;因此，我更愿意把 Cocos Creator CLI 看成开发与验证的工作台：它让 AI 能对目标工程执行有限操作，也能用同一个工程身份运行检查、保存报告、读取失败证据，再对修复结果做回归。拼 UI 是其中一种任务；持续验证和修复，才是它更值得投入的地方。

&emsp;&emsp;前几篇分别介绍了 CLI 的组件分工、安装接入和写入核验流程；这一篇把重点落在测试与迭代上。能力细节和版本边界仍以 CLI README、项目测试运行器说明和 Creator 2.4.15 UI 验收矩阵为准。

- [第一篇：让 AI 真正进入 Cocos Creator：CLI、MCP 与编辑器扩展如何分工](/2026/10/26/AI/cocos-creator-agent-cli-architecture/)
- [第二篇：从安装到接入：Cocos Creator Agent CLI 配置实录](/2026/10/26/AI/cocos-creator-agent-cli-install-guide/)
- [第三篇：Cocos Creator AI 操作，怎样做到计划可查、结果可核对](/2026/10/26/AI/cocos-creator-agent-cli-skills-and-safe-writes/)

参考：

- [Cocos Creator Agent CLI README](https://github.com/baiyangzuoshu/CocosAgent/blob/main/cocos-creator-agent-cli/README.md)
- [Creator 项目测试与持续验证说明](https://github.com/baiyangzuoshu/CocosAgent/blob/main/cocos-creator-agent-cli/references/2x/14-project-test-runner.md)
- [Creator 2.4.15 UI 验收矩阵](https://github.com/baiyangzuoshu/CocosAgent/blob/main/docs/agent-foundation/cocos-cli-ui-acceptance-matrix-2.4.15.md)
