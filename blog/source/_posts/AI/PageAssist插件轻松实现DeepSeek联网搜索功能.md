---
title: PageAssist插件轻松实现DeepSeek联网搜索功能
date: 2025-02-15 10:35:57
categories:
- AI
tags:
- PageAssist
---
![page assist](/images/2025/pageAssist.jpg)

# 1、安装 PageAssist
可以从 Github 仓库去获得安装地址：
https://github.com/n4ze3m/page-assist
也可以直接使用下面的地址：
Chrome
https://chrome.google.com/webstore/detail/page-assist/jfgfiigpkhlkbnfnbobbkinehhfdhndo
FireFox
https://addons.mozilla.org/en-US/firefox/addon/page-assist/
MS Edge
https://microsoftedge.microsoft.com/addons/detail/page-assist-a-web-ui-fo/ogkogooadflifpmmidmhjedogicnhooa

# 2、配置 PageAssist
打开设置面板
安装成功后，打开插件，点击右上角的设置按钮。
![](/images/2025/as1.webp)

配置 API 提供商
左边栏选择 OpenAI Compatible API，然后选择 Add Provider。
![](/images/2025/as2.webp)

在弹出的窗口中，填上相应的信息即可。

Provider Name：随便填，比如 硅基流动
Base URL：填 https://api.siliconflow.cn 即可。
API Key：把刚刚创建的 KEY 复制粘贴过来即可。
![](/images/2025/as3.webp)

配置大模型
1、选择 Manage Models -> Custom Models -> Add New Model
![](/images/2025/as4.webp)

2、在弹出的窗口中，填写相应的信息。
Model ID:每个平台提供的不太一样，硅基流动的是 deepseek-ai/DeepSeek-R1
Provider：选择刚刚新增的提供商，比如 硅基流动。
![](/images/2025/as5.webp)
点保存就可以了。

使用
1、配置成功后，点击右上方，Select Model，下拉列表中，就会出现对应的模型ID了，选择它即可。
![](/images/2025/as6.webp)

2、点击左上角的 New Chat 按钮，打开输入框中的联网搜索功能。
![](/images/2025/as7.webp)





