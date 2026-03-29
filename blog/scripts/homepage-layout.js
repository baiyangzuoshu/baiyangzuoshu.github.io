const { JSDOM } = require("jsdom");
const { escapeHTML, stripHTML, truncate, unescapeHTML } = require("hexo-util");

function toArray(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.toArray === "function") return collection.toArray();
  return Array.from(collection);
}

function toPlainText(input) {
  if (!input) return "";

  return unescapeHTML(stripHTML(String(input)))
    .replace(/&(nbsp|ensp|emsp|thinsp);/gi, " ")
    .replace(/&#(160|8194|8195|8201);/g, " ")
    .replace(/\u2003/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePath(path) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function categoryEntries(post) {
  return toArray(post && post.categories)
    .map((category) => ({
      name: category && category.name ? String(category.name) : "",
      path: normalizePath(category && category.path ? category.path : ""),
    }))
    .filter((category) => category.name);
}

function isWeekly(post) {
  const categories = categoryEntries(post).map((category) => category.name);
  return categories.includes("周刊") || String(post && post.source).includes("/week/");
}

function formatDate(post) {
  if (!post || !post.date || typeof post.date.format !== "function") return "";
  return post.date.format("YYYY-MM-DD");
}

function issueLabel(post) {
  const title = String((post && post.title) || "");
  const match = title.match(/第\s*([0-9]+)\s*期/);
  if (!match) return "周刊";
  return `第 ${match[1]} 期`;
}

function extractImage(post) {
  const sources = [post && post.content, post && post.excerpt, post && post.raw];

  for (const source of sources) {
    if (!source) continue;

    let match = String(source).match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) return match[1];

    match = String(source).match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (match) return match[1];
  }

  return "";
}

function excerpt(post, limit) {
  const description = post && (post.description || post.excerpt || post.content);
  return truncate(toPlainText(description), limit || 140);
}

function renderCategoryPills(post, limit) {
  const categories = categoryEntries(post).slice(0, limit || 2);

  if (!categories.length) return "";

  return categories
    .map(
      (category) =>
        `<a class="home-pill" href="${escapeHTML(category.path)}">${escapeHTML(category.name)}</a>`
    )
    .join("");
}

function renderLeadCard(post) {
  if (!post) return "";

  const image = extractImage(post);
  const summary = excerpt(post, 120);
  const url = normalizePath(post.path);

  return [
    '<article class="home-card home-card--lead">',
    image
      ? '    <a class="home-card-art" href="' +
        escapeHTML(url) +
        '"><img loading="lazy" decoding="async" src="' +
        escapeHTML(image) +
        '" alt="' +
        escapeHTML(post.title || "") +
        '"></a>'
      : '    <div class="home-card-art home-card-art--placeholder"><span>专题文章</span></div>',
    '    <div class="home-card-body">',
    '      <div class="home-card-meta"><time>' +
      escapeHTML(formatDate(post)) +
      "</time>" +
      renderCategoryPills(post, 2) +
      "</div>",
    '      <h3 class="home-card-title"><a class="home-card-title-link" href="' +
      escapeHTML(url) +
      '">' +
      escapeHTML(post.title || "未命名文章") +
      "</a></h3>",
    summary ? '      <p class="home-card-excerpt">' + escapeHTML(summary) + "</p>" : "",
    "    </div>",
    "</article>",
  ].join("");
}

function renderMiniCard(post) {
  const url = normalizePath(post.path);
  const summary = excerpt(post, 72);

  return [
    '<article class="home-card home-card--mini">',
    '    <div class="home-card-body">',
    '      <div class="home-card-meta"><time>' +
      escapeHTML(formatDate(post)) +
      "</time>" +
      renderCategoryPills(post, 1) +
      "</div>",
    '      <h3 class="home-card-title"><a class="home-card-title-link" href="' +
      escapeHTML(url) +
      '">' +
      escapeHTML(post.title || "未命名文章") +
      "</a></h3>",
    summary ? '      <p class="home-card-excerpt">' + escapeHTML(summary) + "</p>" : "",
    "    </div>",
    "</article>",
  ].join("");
}

function renderWeeklyItem(post) {
  const url = normalizePath(post.path);
  const summary = excerpt(post, 88);

  return [
    '<li class="home-weekly-item">',
    '  <a class="home-weekly-link" href="' + escapeHTML(url) + '">',
    '    <span class="home-weekly-issue">' + escapeHTML(issueLabel(post)) + "</span>",
    '    <div class="home-weekly-copy">',
    '      <span class="home-weekly-title">' + escapeHTML(post.title || "未命名周刊") + "</span>",
    '      <span class="home-weekly-meta">' + escapeHTML(formatDate(post)) + "</span>",
    summary ? '      <span class="home-weekly-excerpt">' + escapeHTML(summary) + "</span>" : "",
    "    </div>",
    "  </a>",
    "</li>",
  ].join("");
}

function renderStreamItem(post) {
  const url = normalizePath(post.path);
  const weekly = isWeekly(post);
  const summary = excerpt(post, 84);

  return [
    '<article class="home-stream-item' + (weekly ? " is-weekly" : " is-feature") + '">',
    '  <a class="home-stream-link" href="' + escapeHTML(url) + '">',
    '    <span class="home-stream-badge">' + escapeHTML(weekly ? "周刊" : "专题") + "</span>",
    '    <h3 class="home-stream-title">' + escapeHTML(post.title || "未命名文章") + "</h3>",
    '    <div class="home-stream-meta"><time>' + escapeHTML(formatDate(post)) + "</time></div>",
    summary ? '    <p class="home-stream-excerpt">' + escapeHTML(summary) + "</p>" : "",
    "  </a>",
    "</article>",
  ].join("");
}

function findCategoryPath(hexo, name) {
  const categories = toArray(hexo.locals.get("categories"));
  const match = categories.find((category) => category && category.name === name);
  return normalizePath(match && match.path ? match.path : "");
}

function sidebarCategories(hexo) {
  const categories = toArray(hexo.locals.get("categories"));
  const priority = new Map([
    ["周刊", 0],
    ["藏书", 1],
    ["读书", 2],
    ["算法", 3],
    ["游戏开发", 4],
    ["AI", 5],
    ["Cocoscreator", 6],
    ["思考", 7],
  ]);

  return categories
    .filter((category) => category && category.length)
    .map((category) => ({
      name: String(category.name || ""),
      path: normalizePath(category.path || ""),
      count: Number(category.length || 0),
    }))
    .sort((left, right) => {
      const leftPriority = priority.has(left.name) ? priority.get(left.name) : 99;
      const rightPriority = priority.has(right.name) ? priority.get(right.name) : 99;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return right.count - left.count;
    })
    .slice(0, 8);
}

function renderSidebarList(posts, emptyLabel) {
  if (!posts.length) {
    return `<p class="home-sidebar-empty">${escapeHTML(emptyLabel)}</p>`;
  }

  return [
    '<ol class="home-sidebar-list">',
    posts
      .map((post) => {
        const url = normalizePath(post.path);

        return [
          '<li class="home-sidebar-item">',
          '  <a class="home-sidebar-item-link" href="' + escapeHTML(url) + '">',
          '    <span class="home-sidebar-item-title">' + escapeHTML(post.title || "未命名文章") + "</span>",
          '    <span class="home-sidebar-item-meta">' + escapeHTML(formatDate(post)) + "</span>",
          "  </a>",
          "</li>",
        ].join("");
      })
      .join(""),
    "</ol>",
  ].join("");
}

function buildSidebar(hexo, allPosts) {
  const weeklyPosts = allPosts.filter(isWeekly).slice(0, 5);
  const featurePosts = allPosts.filter((post) => !isWeekly(post)).slice(0, 5);
  const categories = sidebarCategories(hexo);
  const weeklyPath = findCategoryPath(hexo, "周刊");
  const archivePath = normalizePath(hexo.config.archive_dir || "archives");
  const feedPath = normalizePath(
    (hexo.config.feed && hexo.config.feed.path) || "atom.xml"
  );
  const topicPages = [
    { name: "算法专题", path: "/topics/algorithm/" },
    { name: "游戏开发专题", path: "/topics/game-development/" },
    { name: "藏书专题", path: "/topics/library/" },
    { name: "周刊精选", path: "/topics/weekly-highlights/" },
  ];

  return [
    '<section class="home-sidebar-panel home-sidebar-panel--topics">',
    '  <div class="home-sidebar-head"><p class="home-kicker">内容索引</p><h3>栏目导航</h3></div>',
    '  <div class="home-sidebar-grid">',
    categories
      .map(
        (category) =>
          '<a class="home-sidebar-topic" href="' +
          escapeHTML(category.path) +
          '"><span class="home-sidebar-topic-count">' +
          escapeHTML(String(category.count)) +
          '</span><span class="home-sidebar-topic-name">' +
          escapeHTML(category.name) +
          "</span></a>"
      )
      .join(""),
    "  </div>",
    "</section>",
    '<section class="home-sidebar-panel">',
    '  <div class="home-sidebar-head"><p class="home-kicker">专题</p><h3>近期专题</h3></div>',
    renderSidebarList(featurePosts, "暂无专题文章"),
    "</section>",
    '<section class="home-sidebar-panel">',
    '  <div class="home-sidebar-head"><p class="home-kicker">周刊</p><h3>近期周刊</h3></div>',
    renderSidebarList(weeklyPosts, "暂无周刊内容"),
    "</section>",
    '<section class="home-sidebar-panel home-sidebar-panel--actions">',
    '  <div class="home-sidebar-head"><p class="home-kicker">专题页</p><h3>长期主题</h3></div>',
    '  <div class="home-sidebar-actions">',
    topicPages
      .map(
        (topic) =>
          '    <a class="home-sidebar-action" href="' +
          escapeHTML(topic.path) +
          '">' +
          escapeHTML(topic.name) +
          "</a>"
      )
      .join(""),
    "  </div>",
    "</section>",
    '<section class="home-sidebar-panel home-sidebar-panel--actions">',
    '  <div class="home-sidebar-head"><p class="home-kicker">入口</p><h3>快速入口</h3></div>',
    '  <div class="home-sidebar-actions">',
    '    <a class="home-sidebar-action" href="' + escapeHTML(weeklyPath) + '">周刊归档</a>',
    '    <a class="home-sidebar-action" href="' + escapeHTML(archivePath) + '">全部归档</a>',
    '    <a class="home-sidebar-action" href="' + escapeHTML(feedPath) + '">RSS 订阅</a>',
    "  </div>",
    "</section>",
  ].join("");
}

function buildHomepage(hexo, allPosts) {
  const weeklyPosts = allPosts.filter(isWeekly);
  const featurePosts = allPosts.filter((post) => !isWeekly(post));
  const leadPost = featurePosts[0];
  const weeklyPath = findCategoryPath(hexo, "周刊");
  const archivePath = normalizePath(hexo.config.archive_dir || "archives");
  const streamPosts = [];

  for (let index = 0; index < 3; index++) {
    if (featurePosts[index]) {
      streamPosts.push(featurePosts[index]);
    }

    if (weeklyPosts[index]) {
      streamPosts.push(weeklyPosts[index]);
    }
  }

  return [
    '<div class="home-split-layout">',
    '  <section class="home-hero-panel">',
    '    <p class="home-kicker">站点概览</p>',
    '    <h2 class="home-hero-title">专题文章与每周见闻分层呈现。</h2>',
    '    <div class="home-hero-stats">',
    '      <div class="home-stat"><span class="home-stat-value">' +
      escapeHTML(String(featurePosts.length)) +
      '</span><span class="home-stat-label">专题文章</span></div>',
    '      <div class="home-stat"><span class="home-stat-value">' +
      escapeHTML(String(weeklyPosts.length)) +
      '</span><span class="home-stat-label">每周见闻</span></div>',
    "    </div>",
    '    <div class="home-hero-actions">',
    '      <a class="home-action home-action--primary" href="' + escapeHTML(weeklyPath) + '">周刊归档</a>',
    '      <a class="home-action" href="' + escapeHTML(archivePath) + '">全部归档</a>',
    "    </div>",
    "  </section>",
    '  <section class="home-panel home-panel--feature">',
    '    <div class="home-section-head">',
    '      <div><p class="home-kicker">专题文章</p><h2>非周刊更新</h2></div>',
    '      <a class="home-section-link" href="' + escapeHTML(archivePath) + '">查看全部</a>',
    "    </div>",
    '    <div class="home-feature-grid">',
    renderLeadCard(leadPost),
    '      <div class="home-feature-stack">',
    featurePosts.slice(1, 5).map(renderMiniCard).join(""),
    "      </div>",
    "    </div>",
    "  </section>",
    '  <section class="home-panel home-panel--weekly">',
    '    <div class="home-section-head">',
    '      <div><p class="home-kicker">每周见闻</p><h2>周刊更新</h2></div>',
    '      <a class="home-section-link" href="' + escapeHTML(weeklyPath) + '">进入周刊</a>',
    "    </div>",
    '    <ol class="home-weekly-list">',
    weeklyPosts.slice(0, 8).map(renderWeeklyItem).join(""),
    "    </ol>",
    "  </section>",
    '  <section class="home-panel home-panel--stream">',
    '    <div class="home-section-head">',
      '      <div><p class="home-kicker">最近更新</p><h2>最新发布</h2></div>',
    "    </div>",
    '    <div class="home-stream-grid">',
    streamPosts.map(renderStreamItem).join(""),
    "    </div>",
    "  </section>",
    "</div>",
  ].join("");
}

hexo.extend.filter.register(
  "after_render:html",
  function (str, data) {
    if (!data || data.path !== "index.html") {
      return str;
    }

    const sitePosts = toArray(this.locals.get("posts"))
      .filter((post) => post && post.layout === "post" && post.published !== false)
      .sort((left, right) => Number(right.date) - Number(left.date));

    if (!sitePosts.length) {
      return str;
    }

    const dom = new JSDOM(str);
    const { document } = dom.window;
    const body = document.body;
    const main = document.querySelector("#main");
    const sidebar = document.querySelector("#sidebar");
    const pageNav = document.querySelector("#page-nav");

    if (!body || !main) {
      return str;
    }

    body.classList.add("home-layout-layered");
    main.innerHTML = buildHomepage(this, sitePosts) + (pageNav ? pageNav.outerHTML : "");

    if (sidebar) {
      sidebar.classList.add("home-sidebar-curated");
      sidebar.innerHTML = buildSidebar(this, sitePosts);
    }

    return dom.serialize();
  },
  20
);
