---
title: "LeanCloud 的兴起、巅峰与落幕：AI 摧毁了旧式 BaaS"
date: 2026-06-05 10:00:00
permalink: "2026/06/05/thoughts/LeanCloud的兴起巅峰与落幕/"
categories:
- 思考
description: "从 LeanCloud 停服公告出发，回看它从 AVOS Cloud 到 LeanCloud 的兴起、巅峰，以及 AI 编程时代对旧式 BaaS 的冲击。"
tags:
- LeanCloud
- AI
- 云服务
---

![](/images/2026/LeanCloud.jpeg)

&emsp;&emsp;LeanCloud 官方已经发布停服通知：从 2026 年 1 月 12 日起停止新用户注册、停止创建新应用；到 2027 年 1 月 12 日，正式停止对外服务，包括应用访问、数据读写、API 调用和控制台使用等。这个消息对很多早年做移动应用、小游戏、独立项目的人来说，多少有些时代结束的意味。

&emsp;&emsp;LeanCloud 的前身是 AVOS Cloud。它兴起的时候，正是移动互联网快速爆发的阶段。那时做一个 App，前端开发已经越来越快，但后端仍然是很多小团队的负担。用户系统、数据存储、文件上传、消息推送、即时通信、云函数、统计分析，这些东西每一样都不算神秘，但都要人搭建、部署、维护。对一个创业团队或独立开发者来说，后端往往不是核心创新，却会消耗大量时间。

&emsp;&emsp;LeanCloud 抓住的就是这个痛点。它把后端能力包装成 SDK 和控制台，让开发者可以像调用本地接口一样使用云端数据。你不用先招后端，不用先买服务器，也不用从零设计数据库和权限系统。只要把应用接入进去，就能快速做出一个可用版本。这在当时非常有吸引力。

&emsp;&emsp;它的巅峰，来自那个时代对“快速上线”的需求。移动互联网、小游戏、工具类产品、社区产品，都需要低成本试错。LeanCloud 代表的是一种典型的 BaaS 价值：帮开发者省掉重复后端工作，让产品更快进入市场。后来心动收购 LeanCloud，也说明它在游戏和开发者服务领域有真实价值。很多项目不是因为 LeanCloud 多么庞大而选择它，而是因为它足够轻、足够快、足够顺手。

&emsp;&emsp;但也正是这个优点，埋下了它后来的问题。BaaS 的核心价值，是替开发者屏蔽后端复杂性。可是当云服务、Serverless、低代码、开源后端框架不断成熟之后，这种复杂性本身就在下降。开发者可以选择 Firebase、Supabase、Appwrite，也可以选择云厂商提供的数据库、函数计算和对象存储。LeanCloud 逐渐不再是唯一简单的方案。

&emsp;&emsp;真正改变局面的，是 AI。这里说 AI 摧毁了 LeanCloud，并不是说某个 AI 产品直接让它关停，而是 AI 编程改变了开发者对“后端门槛”的感受。过去，一个人想写后端，会被模型设计、接口实现、鉴权、部署、日志、测试吓住。现在，Codex、Claude、DeepSeek 这类工具可以帮你搭脚手架、写接口、生成数据库迁移、补测试、解释报错。原本需要平台封装掉的那部分重复劳动，正在被 AI 消化。

&emsp;&emsp;这会动摇旧式 BaaS 的根基。以前开发者愿意为“我不用写后端”付费；现在开发者开始想，“我让 AI 写一个可控后端，是否更自由？”BaaS 的问题在于，它方便，但也带来绑定。数据结构、权限规则、SDK、计费和迁移成本，都在平台里。AI 让自建后端的成本下降之后，开发者对绑定的容忍度自然会降低。

&emsp;&emsp;LeanCloud 的落幕，不只是某家公司服务停止，也是一类产品逻辑的退场。它曾经解决了一个真实问题：小团队如何快速拥有后端能力。但今天这个问题有了新的答案。AI 不仅帮人写代码，也在重塑工具链的价值顺序。过去值钱的是“把复杂能力封装成平台”，现在越来越值钱的是“帮开发者掌控复杂系统”。

&emsp;&emsp;所以我对 LeanCloud 的评价并不低。它在自己的时代做对了事情，也帮助过很多开发者。但时代变化之后，旧答案会失效。LeanCloud 从兴起到巅峰，再到 2027 年停止服务，像是移动互联网 BaaS 时代的一条完整曲线。AI 到来后，开发者重新拿回了后端实现权，而旧式 BaaS 的护城河，也随之被一点点拆掉。

参考：

- [LeanCloud 停服公告](https://docs.leancloud.cn/sdk/announcements/sunset-announcement)
- [XD Inc. Completes Acquisition of LeanCloud](https://2400.hk/en/news-single/11139)
- [AVOS Cloud Announces Series A Funding](https://technode.com/2014/09/24/avos-cloud-chinese-company-backed-youtube-founders-announces-funding/)
