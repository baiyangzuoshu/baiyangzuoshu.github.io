# AGENTS.md

本文件适用于整个仓库。

## 项目概览

这是一个个人 Hexo 博客仓库，真正的站点工程位于 `blog/`。根目录主要保留仓库说明、GitHub Actions 配置和本文件。

站点基本信息与大部分功能开关在 `blog/_config.yml` 中维护。当前主题是 `landscape`，通过 npm 依赖提供。

## 常用命令

所有 npm 命令都应在 `blog/` 目录下执行：

```bash
cd blog
npm ci
npm run server
npm run build
```

其他可用命令：

```bash
cd blog
npm run clean
npm run images:optimize
INDEXNOW_DRY_RUN=1 npm run indexnow
```

发布命令会写入远端或触发外部服务，只有在用户明确要求发布时才执行：

```bash
cd blog
npm run deploy
npm run publish
```

`npm run publish` 会先压缩图片，再执行发布。

## 依赖与运行环境

- 使用 npm 和 `blog/package-lock.json`，不要改用 yarn、pnpm 或 bun。
- GitHub Actions 使用 Node.js 20、`npm ci` 和 `npm run build`。
- 修改依赖时，同时更新 `blog/package.json` 和 `blog/package-lock.json`。

## 目录约定

- `blog/source/_posts/`：文章源文件，按主题目录组织。
- `blog/source/images/`、`blog/source/books/`：图片、书影等静态资源。
- `blog/source/css/`、`blog/source/js/`：站点自定义静态样式和脚本。
- `blog/scripts/`：Hexo 脚本扩展，例如 SEO、菜单、专题页、IndexNow。
- `blog/tools/`：本地工具脚本，主要用于图片批处理压缩。
- `blog/scaffolds/`：Hexo 新建内容模板。
- `.github/workflows/deploy.yml`：CI 构建与部署流程。

不要把下列目录当作源文件修改或提交：

- `blog/node_modules/`
- `blog/public/`
- `blog/.deploy_git/`
- `blog/db.json`
- `.reasonix/`
- `.DS_Store`、`*.log`

如果需要更新生成结果，优先修改源文件或配置，再运行对应构建命令验证。

## 内容编辑规则

- 文章以中文为主，保留现有标题、分类、标签和 front matter 风格。
- 新文章放在 `blog/source/_posts/` 下合适的主题目录中。
- 引用站内资源时优先使用站点根路径，例如 `/images/2026/example.jpg`。
- 当前配置启用了 `post_asset_folder: true` 和 `marked.postAsset`，移动文章或图片前要确认引用路径不会失效。
- 不要随意重命名已发布文章文件或改动 permalink 相关配置，除非用户明确要求处理历史链接。

## 配置与密钥

- 不要提交真实令牌、PAT、私钥或本地机器专用路径。
- Giscus 与 Microsoft Clarity 可通过 `blog/_config.yml` 或环境变量配置。
- CI 中相关变量来自 GitHub Actions secrets，例如 `GISCUS_REPO_ID`、`GISCUS_CATEGORY_ID`、`CLARITY_PROJECT_ID`。
- 本地发布如需 `HEXO_DEPLOY_TOKEN` 或 SSH 凭据，应让用户自行提供或确认，不要写入仓库文件。

## 验证要求

修改站点配置、脚本、主题覆盖、文章结构或静态资源引用后，至少运行：

```bash
cd blog
npm run build
```

修改图片批处理逻辑后，运行：

```bash
cd blog
npm run images:optimize
```

修改 IndexNow 逻辑后，先 dry run：

```bash
cd blog
npm run build
INDEXNOW_DRY_RUN=1 npm run indexnow
```

如果因为缺少本地依赖、网络权限或发布凭据导致命令无法运行，在最终回复中明确说明未验证的命令和原因。

## Git 与发布注意事项

- 工作区可能包含用户未提交的改动；不要回滚、删除或覆盖无关改动。
- 提交前检查 `git status --short`，避免把生成目录或本地元数据带入提交。
- `main` 分支推送会触发 `.github/workflows/deploy.yml`，该工作流构建 `blog/` 并通过 Hexo 部署到配置的发布分支。
- `blog/_config.yml` 中的 Hexo deploy 配置目标分支为 `master`，不要在未确认的情况下更改发布目标。
