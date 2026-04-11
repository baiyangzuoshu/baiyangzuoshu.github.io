个人博客。

## 本地开发

```bash
cd blog
npm ci
npm run server
```

## 发布

默认发布：

```bash
cd blog
export HEXO_DEPLOY_TOKEN=你的 GitHub PAT
npm run deploy
```

压图后再发布：

```bash
cd blog
export HEXO_DEPLOY_TOKEN=你的 GitHub PAT
npm run publish
```

如果本机 SSH 已配置完成，也可以继续使用 SSH 发布。

## 启用 Giscus 评论

站点已支持 `giscus`，但只有在配置完整时才会显示评论区。

需要填写的配置位于 `blog/_config.yml`：

- `comments.giscus.repo`
- `comments.giscus.repo_id`
- `comments.giscus.category`
- `comments.giscus.category_id`

最短流程：

1. 在 GitHub 仓库开启 `Discussions`
2. 安装并授权 `giscus` GitHub App
3. 到 [giscus 官方配置页](https://giscus.app/zh-CN) 选择仓库和 Discussion 分类
4. 复制 `repository id`、`category id` 和分类名，填回 `blog/_config.yml`

本地也可以不改仓库文件，直接用环境变量覆盖：

```bash
cd blog
export GISCUS_REPO="baiyangzuoshu/baiyangzuoshu.github.io"
export GISCUS_REPO_ID="你的_repo_id"
export GISCUS_CATEGORY="Announcements"
export GISCUS_CATEGORY_ID="你的_category_id"
npm run build
```

## 启用 Microsoft Clarity 统计

站点已支持 `Microsoft Clarity`，但只有在 `project_id` 已配置时才会注入统计脚本。

需要填写的配置位于 `blog/_config.yml`：

- `analytics.clarity.project_id`
- `analytics.clarity.script_host`

获取方法：

1. 登录 [Microsoft Clarity](https://clarity.microsoft.com/)
2. 新建或进入你的项目
3. 打开 `Settings` 或 `Setup`
4. 复制安装代码里的项目 ID，或在项目设置页查看 `Project ID`

本地环境变量示例：

```bash
cd blog
export CLARITY_PROJECT_ID="你的_project_id"
npm run build
```

官方文档：

- [giscus 官方](https://giscus.app/zh-CN)
- [Clarity Setup](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup)
- [Clarity Getting Started](https://learn.microsoft.com/en-us/clarity/setup-and-installation/getting-started)

## GitHub Actions Secrets

如果希望 CI 构建时也自动带上评论和统计配置，在仓库 `Settings -> Secrets and variables -> Actions` 中添加这些 secrets：

- `GISCUS_REPO`
- `GISCUS_REPO_ID`
- `GISCUS_CATEGORY`
- `GISCUS_CATEGORY_ID`
- `CLARITY_PROJECT_ID`

可选：

- `GISCUS_MAPPING`
- `GISCUS_THEME`
- `GISCUS_LANG`
- `CLARITY_SCRIPT_HOST`

工作流 `.github/workflows/deploy.yml` 已经会自动读取这些 secrets 并在构建时注入。

## 启用 IndexNow

站点已接入 `IndexNow`：

- 根目录验证文件已经放在 `blog/source/b10c0c69-d2f2-4b15-aa23-32eb47104762.txt`
- `hexo deploy` 完成后会自动读取 `public/sitemap.txt` 并向 IndexNow 提交 URL
- 如果需要手动重试，可以执行 `npm run indexnow`

相关配置位于 `blog/_config.yml`：

- `indexnow.enable`
- `indexnow.endpoint`
- `indexnow.key`
- `indexnow.batch_size`
- `indexnow.dry_run`

本地验证示例：

```bash
cd blog
npm run build
INDEXNOW_DRY_RUN=1 npm run indexnow
```

官方文档：

- [IndexNow](https://www.indexnow.org/documentation)
- [IndexNow FAQ](https://www.indexnow.org/faq)

## 图片批处理压缩

仓库内已提供批处理脚本：

```bash
cd blog
npm run images:optimize
```

默认会递归处理 `blog/source` 下的 `jpg/jpeg/png/gif/webp` 文件，并且只在新文件更小时覆盖原图。

也可以直接指定目录：

```bash
cd blog
bash ./tools/optimize-images.sh source/images/2025
bash ./tools/optimize-images.sh source/books/2
```

Windows 下可直接使用同一个 npm 命令，或者手动执行：

```bat
cd blog
npm run images:optimize
tools\optimize-images.bat source\images\2025
```

可选环境变量：

- `MAX_JPEG_EDGE`
- `JPEG_QUALITY`
- `LARGE_JPEG_QUALITY`
- `PNG_QUALITY`
- `GIF_FPS`
- `GIF_MAX_WIDTH`
- `GIF_MEDIUM_WIDTH`
- `WEBP_QUALITY`
