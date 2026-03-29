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

function escapeUrl(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function collection(locals, name) {
  if (!locals) return [];
  if (typeof locals.get === "function") return locals.get(name);
  if (Object.prototype.hasOwnProperty.call(locals, name)) return locals[name];
  return [];
}

function sitePosts(locals) {
  return toArray(collection(locals, "posts"))
    .filter((post) => post && post.layout === "post" && post.published !== false)
    .sort((left, right) => Number(right.date) - Number(left.date));
}

function categoryEntries(post) {
  return toArray(post && post.categories)
    .map((category) => ({
      name: category && category.name ? String(category.name) : "",
      path: normalizePath(category && category.path ? category.path : ""),
    }))
    .filter((category) => category.name);
}

function tagEntries(post) {
  return toArray(post && post.tags)
    .map((tag) => ({
      name: tag && tag.name ? String(tag.name) : "",
      path: normalizePath(tag && tag.path ? tag.path : ""),
    }))
    .filter((tag) => tag.name);
}

function hasCategory(post, name) {
  return categoryEntries(post).some((category) => category.name === name);
}

function postBucket(post) {
  const source = String((post && post.source) || "");
  const match = source.match(/_posts\/([^/]+)/);
  return match ? match[1].toLowerCase() : "";
}

function isWeekly(post) {
  return hasCategory(post, "周刊") || postBucket(post) === "week";
}

function formatDate(post) {
  if (!post || !post.date || typeof post.date.format !== "function") return "";
  return post.date.format("YYYY-MM-DD");
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
  return truncate(toPlainText(description), limit || 120);
}

function renderCategoryPills(post, limit) {
  const categories = categoryEntries(post).slice(0, limit || 2);

  if (!categories.length) return "";

  return categories
    .map(
      (category) =>
        `<a class="topic-pill" href="${escapeUrl(category.path)}">${escapeHTML(category.name)}</a>`
    )
    .join("");
}

function renderCategoryBadges(post, limit) {
  const categories = categoryEntries(post).slice(0, limit || 2);

  if (!categories.length) return "";

  return categories
    .map(
      (category) =>
        `<span class="topic-pill topic-pill--static">${escapeHTML(category.name)}</span>`
    )
    .join("");
}

function renderTopicChip(href, label) {
  return `<a class="topic-chip" href="${escapeUrl(href)}">${escapeHTML(label)}</a>`;
}

const TOPICS = [
  {
    slug: "algorithm",
    title: "算法专题",
    summary: "围绕搜索、压缩与碰撞判定，集中整理算法相关文章。",
    categoryNames: ["算法"],
    matches(post) {
      return hasCategory(post, "算法");
    },
  },
  {
    slug: "game-development",
    title: "游戏开发专题",
    summary: "汇集游戏架构、玩法实现与 Cocoscreator 相关实践。",
    categoryNames: ["游戏开发", "Cocoscreator"],
    matches(post) {
      return hasCategory(post, "游戏开发") || hasCategory(post, "Cocoscreator");
    },
  },
  {
    slug: "library",
    title: "藏书专题",
    summary: "收拢藏书、古籍与读书随记，形成长期阅读线索。",
    categoryNames: ["藏书", "读书"],
    matches(post) {
      return hasCategory(post, "藏书") || hasCategory(post, "读书");
    },
  },
  {
    slug: "weekly-highlights",
    title: "周刊精选",
    summary: "集中呈现每周见闻的连续更新，方便按专题回看近期记录。",
    categoryNames: ["周刊"],
    matches(post) {
      return isWeekly(post);
    },
  },
];

function topicPath(topic) {
  return `/topics/${topic.slug}/`;
}

function topicForPost(post) {
  return TOPICS.find((topic) => topic.matches(post)) || null;
}

function categoryPathByName(locals, name) {
  const categories = toArray(collection(locals, "categories"));
  const match = categories.find((category) => category && category.name === name);
  return normalizePath(match && match.path ? match.path : "");
}

function topicCategoryLinks(locals, topic) {
  return topic.categoryNames
    .map((name) => {
      const path = categoryPathByName(locals, name);
      if (!path) return "";
      return renderTopicChip(path, name);
    })
    .filter(Boolean)
    .join("");
}

function renderTopicLead(post) {
  if (!post) return "";

  const image = extractImage(post);
  const url = normalizePath(post.path);
  const summary = excerpt(post, 120);

  return [
    '<article class="topic-card topic-card--lead">',
    image
      ? '  <a class="topic-card-art" href="' +
        escapeUrl(url) +
        '"><img loading="lazy" decoding="async" src="' +
        escapeUrl(image) +
        '" alt="' +
        escapeHTML(post.title || "") +
        '"></a>'
      : '  <div class="topic-card-art topic-card-art--placeholder"><span>专题文章</span></div>',
    '  <div class="topic-card-body">',
    '    <div class="topic-card-meta"><time>' +
      escapeHTML(formatDate(post)) +
      "</time>" +
      renderCategoryPills(post, 2) +
      "</div>",
    '    <h3 class="topic-card-title"><a href="' +
      escapeUrl(url) +
      '">' +
      escapeHTML(post.title || "未命名文章") +
      "</a></h3>",
    summary ? '    <p class="topic-card-excerpt">' + escapeHTML(summary) + "</p>" : "",
    "  </div>",
    "</article>",
  ].join("");
}

function renderTopicMini(post) {
  const url = normalizePath(post.path);
  const summary = excerpt(post, 72);

  return [
    '<article class="topic-card topic-card--mini">',
    '  <div class="topic-card-body">',
    '    <div class="topic-card-meta"><time>' +
      escapeHTML(formatDate(post)) +
      "</time>" +
      renderCategoryPills(post, 1) +
      "</div>",
    '    <h3 class="topic-card-title"><a href="' +
      escapeUrl(url) +
      '">' +
      escapeHTML(post.title || "未命名文章") +
      "</a></h3>",
    summary ? '    <p class="topic-card-excerpt">' + escapeHTML(summary) + "</p>" : "",
    "  </div>",
    "</article>",
  ].join("");
}

function renderTopicListItem(post) {
  const url = normalizePath(post.path);
  const summary = excerpt(post, 84);

  return [
    '<li class="topic-list-item">',
    '  <a class="topic-list-link" href="' + escapeUrl(url) + '">',
    '    <span class="topic-list-date">' + escapeHTML(formatDate(post)) + "</span>",
    '    <span class="topic-list-title">' + escapeHTML(post.title || "未命名文章") + "</span>",
    summary ? '    <span class="topic-list-excerpt">' + escapeHTML(summary) + "</span>" : "",
    "  </a>",
    "</li>",
  ].join("");
}

function buildTopicPage(locals, topic, posts) {
  const leadPost = posts[0];
  const latestDate = leadPost ? formatDate(leadPost) : "暂无";
  const archivePath = normalizePath(hexo.config.archive_dir || "archives");

  return [
    '<div class="topic-page-shell">',
    '  <section class="topic-hero">',
    '    <p class="topic-kicker">专题页</p>',
    '    <p class="topic-summary">' + escapeHTML(topic.summary) + "</p>",
    '    <div class="topic-stats">',
    '      <div class="topic-stat"><span class="topic-stat-value">' +
      escapeHTML(String(posts.length)) +
      '</span><span class="topic-stat-label">收录文章</span></div>',
    '      <div class="topic-stat"><span class="topic-stat-value">' +
      escapeHTML(latestDate) +
      '</span><span class="topic-stat-label">最近更新</span></div>',
    "    </div>",
    '    <div class="topic-link-grid">',
    topicCategoryLinks(locals, topic),
    renderTopicChip(archivePath, "全部归档"),
    renderTopicChip(normalizePath(hexo.config.feed && hexo.config.feed.path), "RSS 订阅"),
    "    </div>",
    "  </section>",
    '  <section class="topic-panel">',
    '    <div class="topic-panel-head"><p class="topic-kicker">精选内容</p><h2>专题导读</h2></div>',
    '    <div class="topic-feature-grid">',
    renderTopicLead(leadPost),
    '      <div class="topic-feature-stack">',
    posts.slice(1, 5).map(renderTopicMini).join(""),
    "      </div>",
    "    </div>",
    "  </section>",
    '  <section class="topic-panel">',
    '    <div class="topic-panel-head"><p class="topic-kicker">文章索引</p><h2>继续阅读</h2></div>',
    '    <ol class="topic-list">',
    posts.slice(0, 12).map(renderTopicListItem).join(""),
    "    </ol>",
    "  </section>",
    "</div>",
  ].join("");
}

function postScore(target, candidate) {
  const targetCategories = new Set(categoryEntries(target).map((category) => category.name));
  const candidateCategories = categoryEntries(candidate).map((category) => category.name);
  const targetTags = new Set(tagEntries(target).map((tag) => tag.name));
  const candidateTags = tagEntries(candidate).map((tag) => tag.name);
  const targetTopic = topicForPost(target);
  const candidateTopic = topicForPost(candidate);

  let score = 0;

  for (const category of candidateCategories) {
    if (targetCategories.has(category)) score += 8;
  }

  for (const tag of candidateTags) {
    if (targetTags.has(tag)) score += 4;
  }

  if (postBucket(target) && postBucket(target) === postBucket(candidate)) {
    score += 3;
  }

  if (isWeekly(target) && isWeekly(candidate)) {
    score += 3;
  }

  if (targetTopic && candidateTopic && targetTopic.slug === candidateTopic.slug) {
    score += 6;
  }

  if (!isWeekly(target) && isWeekly(candidate)) {
    score -= 4;
  }

  return score;
}

function relatedPostsFor(post, allPosts, limit) {
  const sameLaneFallback = allPosts.filter((candidate) => {
    if (!candidate || candidate._id === post._id) return false;
    if (isWeekly(post)) return isWeekly(candidate);
    return !isWeekly(candidate);
  });

  const ranked = allPosts
    .filter((candidate) => candidate && candidate._id !== post._id)
    .map((candidate) => ({
      post: candidate,
      score: postScore(post, candidate),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return Number(right.post.date) - Number(left.post.date);
    })
    .map((entry) => entry.post)
    .filter((candidate, index, list) => list.findIndex((item) => item._id === candidate._id) === index);

  const selected = ranked.filter((candidate) => postScore(post, candidate) > 0).slice(0, limit || 3);

  if (selected.length > 0) {
    return selected;
  }

  for (const candidate of sameLaneFallback) {
    if (selected.some((item) => item._id === candidate._id)) continue;
    selected.push(candidate);
    if (selected.length >= (limit || 3)) break;
  }

  return selected.slice(0, limit || 3);
}

function renderRelatedCard(post) {
  const url = normalizePath(post.path);
  const summary = excerpt(post, 76);

  return [
    '<article class="article-related-card">',
    '  <a class="article-related-card-link" href="' + escapeUrl(url) + '">',
    '    <div class="article-related-meta"><time>' +
      escapeHTML(formatDate(post)) +
      "</time>" +
      renderCategoryBadges(post, 1) +
      "</div>",
    '    <h3 class="article-related-title">' + escapeHTML(post.title || "未命名文章") + "</h3>",
    summary ? '    <p class="article-related-excerpt">' + escapeHTML(summary) + "</p>" : "",
    "  </a>",
    "</article>",
  ].join("");
}

function buildRelatedSection(post, relatedPosts) {
  if (!relatedPosts.length) return "";

  const topic = topicForPost(post);
  const topicLink = topic
    ? '<a class="article-related-link" href="' +
      escapeUrl(topicPath(topic)) +
      '">' +
      escapeHTML(`进入${topic.title}`) +
      "</a>"
    : "";

  return [
    '<section class="article-related-section">',
    '  <div class="article-related-head">',
    '    <div><p class="topic-kicker">延伸阅读</p><h2>相关阅读</h2></div>',
    topicLink,
    "  </div>",
    '  <div class="article-related-grid">',
    relatedPosts.map(renderRelatedCard).join(""),
    "  </div>",
    "</section>",
  ].join("");
}

function isRenderablePostPage(data) {
  if (!data || !data.page || !data.path) {
    return false;
  }

  if (data.page.layout === "page") {
    return false;
  }

  return Boolean(data.page._id && data.page.content);
}

hexo.extend.generator.register("topic-pages", function (locals) {
  const posts = sitePosts(locals);

  return TOPICS.map((topic) => {
    const topicPosts = posts.filter((post) => topic.matches(post));
    const latest = topicPosts[0];

    return {
      path: `topics/${topic.slug}/index.html`,
      data: {
        title: topic.title,
        description: topic.summary,
        comments: false,
        layout: "page",
        content: buildTopicPage(locals, topic, topicPosts),
        date: latest && latest.date ? latest.date : new Date(),
        updated: latest && latest.date ? latest.date : new Date(),
      },
      layout: ["page"],
    };
  });
});

hexo.extend.filter.register(
  "after_render:html",
  function (str, data) {
    if (!isRenderablePostPage(data)) {
      return str;
    }

    const currentPost = data.page;
    const relatedPosts = relatedPostsFor(currentPost, sitePosts(this.locals), 3);

    if (!relatedPosts.length) {
      return str;
    }

    const dom = new JSDOM(str);
    const { document } = dom.window;
    const article = document.querySelector("article.article");

    if (!article || article.querySelector(".article-related-section")) {
      return str;
    }

    const nav = article.querySelector("#article-nav");
    const fragment = JSDOM.fragment(buildRelatedSection(currentPost, relatedPosts));

    if (nav) {
      nav.before(fragment);
    } else {
      article.append(fragment);
    }

    return dom.serialize();
  },
  18
);
