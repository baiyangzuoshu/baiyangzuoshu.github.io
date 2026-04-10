const { escapeHTML, stripHTML, truncate, unescapeHTML } = require("hexo-util");

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function toObject(value) {
  return value && typeof value === "object" ? value : {};
}

function readConfigValue(value, envKey) {
  return asString(process.env[envKey] || value);
}

function getAnalyticsProvider(siteConfig) {
  const analytics = toObject(siteConfig.analytics);
  return readConfigValue(analytics.provider, "ANALYTICS_PROVIDER").toLowerCase();
}

function toBoolean(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizePath(input) {
  const path = asString(input);

  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function toArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value.toArray === "function") {
    return value.toArray();
  }

  return Array.from(value);
}

function categoryEntries(page) {
  return toArray(page && page.categories)
    .map((category) => ({
      name: asString(category && category.name),
      path: normalizePath(category && category.path),
    }))
    .filter((category) => category.name);
}

function tagNames(page) {
  return toArray(page && page.tags)
    .map((tag) => asString(tag && tag.name))
    .filter(Boolean);
}

function isPostPage(data) {
  const page = data && data.page ? data.page : null;
  const path = data && data.path ? String(data.path) : "";

  if (!page || !path) {
    return false;
  }

  if (page.layout === "post") {
    return true;
  }

  if (page.layout === "page") {
    return false;
  }

  if (/^(index\.html|page\/|archives\/|categories\/|tags\/)/.test(path)) {
    return false;
  }

  return Boolean(page.date && page.content && page._id);
}

function buildCanonicalUrl(siteUrl, pagePath) {
  if (!siteUrl || !pagePath) {
    return "";
  }

  let canonicalPath = String(pagePath).replace(/index\.html$/, "");
  if (canonicalPath && !canonicalPath.startsWith("/")) {
    canonicalPath = `/${canonicalPath}`;
  }

  const baseUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  return new URL(canonicalPath.replace(/^\//, ""), baseUrl).toString();
}

function toIsoDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value.toISOString === "function") {
    return value.toISOString();
  }

  if (typeof value.format === "function") {
    return value.format("YYYY-MM-DDTHH:mm:ssZ");
  }

  const text = asString(value);
  if (!text) {
    return "";
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function normalizeAssetUrl(siteUrl, input) {
  const value = asString(input);

  if (!siteUrl || !value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value.replace(/^\//, ""), siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).toString();
}

function extractImageUrl(page, siteUrl) {
  const sources = [page && page.content, page && page.excerpt, page && page.raw];

  for (const source of sources) {
    if (!source) {
      continue;
    }

    let match = String(source).match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) {
      return normalizeAssetUrl(siteUrl, match[1]);
    }

    match = String(source).match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
    if (match) {
      return normalizeAssetUrl(siteUrl, match[1]);
    }
  }

  return "";
}

function stringifyJsonLd(data) {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

function buildPostStructuredData(siteConfig, data, description, canonicalUrl) {
  const page = data && data.page ? data.page : null;

  if (!page || !canonicalUrl) {
    return "";
  }

  const categories = categoryEntries(page);
  const tags = tagNames(page);
  const siteTitle = asString(siteConfig.title) || "Blog";
  const authorName = asString(page.author || siteConfig.author || siteTitle);
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: asString(page.title) || siteTitle,
    description,
    mainEntityOfPage: canonicalUrl,
    datePublished: toIsoDate(page.date),
    dateModified: toIsoDate(page.updated || page.date),
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: siteTitle,
    },
    inLanguage: asString(siteConfig.language || "zh-CN"),
  };

  const image = extractImageUrl(page, siteConfig.url);
  if (image) {
    article.image = [image];
  }

  if (categories.length) {
    article.articleSection = categories.map((category) => category.name);
  }

  if (tags.length) {
    article.keywords = tags.join(", ");
  }

  const itemListElement = [
    {
      "@type": "ListItem",
      position: 1,
      name: "首页",
      item: siteConfig.url,
    },
  ];

  if (categories.length) {
    itemListElement.push({
      "@type": "ListItem",
      position: itemListElement.length + 1,
      name: categories[0].name,
      item: normalizeAssetUrl(siteConfig.url, categories[0].path),
    });
  }

  itemListElement.push({
    "@type": "ListItem",
    position: itemListElement.length + 1,
    name: asString(page.title) || siteTitle,
    item: canonicalUrl,
  });

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };

  return [
    '<script type="application/ld+json" data-schema="post-structured-data">',
    stringifyJsonLd([article, breadcrumb]),
    "</script>",
  ].join("");
}

function commentsAllowed(page) {
  return !(page && page.comments === false);
}

function getGiscusConfig(siteConfig) {
  const comments = toObject(siteConfig.comments);
  const provider = readConfigValue(comments.provider, "COMMENTS_PROVIDER").toLowerCase();

  if (provider !== "giscus") {
    return null;
  }

  const giscus = toObject(comments.giscus);
  const config = {
    repo: readConfigValue(giscus.repo, "GISCUS_REPO"),
    repoId: readConfigValue(giscus.repo_id, "GISCUS_REPO_ID"),
    category: readConfigValue(giscus.category, "GISCUS_CATEGORY"),
    categoryId: readConfigValue(giscus.category_id, "GISCUS_CATEGORY_ID"),
    mapping: readConfigValue(giscus.mapping, "GISCUS_MAPPING") || "pathname",
    strict: toBoolean(process.env.GISCUS_STRICT || giscus.strict, false) ? "1" : "0",
    reactionsEnabled: toBoolean(
      process.env.GISCUS_REACTIONS_ENABLED || giscus.reactions_enabled,
      true
    )
      ? "1"
      : "0",
    emitMetadata: toBoolean(
      process.env.GISCUS_EMIT_METADATA || giscus.emit_metadata,
      false
    )
      ? "1"
      : "0",
    inputPosition:
      readConfigValue(giscus.input_position, "GISCUS_INPUT_POSITION") === "top"
        ? "top"
        : "bottom",
    theme: readConfigValue(giscus.theme, "GISCUS_THEME") || "preferred_color_scheme",
    lang: readConfigValue(giscus.lang, "GISCUS_LANG") || "zh-CN",
  };

  if (!config.repo || !config.repoId || !config.category || !config.categoryId) {
    return null;
  }

  return config;
}

function listMissingGiscusFields(siteConfig) {
  const comments = toObject(siteConfig.comments);
  const provider = readConfigValue(comments.provider, "COMMENTS_PROVIDER").toLowerCase();

  if (provider !== "giscus") {
    return [];
  }

  const giscus = toObject(comments.giscus);
  const required = [
    ["repo", readConfigValue(giscus.repo, "GISCUS_REPO")],
    ["repo_id", readConfigValue(giscus.repo_id, "GISCUS_REPO_ID")],
    ["category", readConfigValue(giscus.category, "GISCUS_CATEGORY")],
    ["category_id", readConfigValue(giscus.category_id, "GISCUS_CATEGORY_ID")],
  ];

  return required.filter((entry) => !entry[1]).map((entry) => entry[0]);
}

function getClarityConfig(siteConfig) {
  if (getAnalyticsProvider(siteConfig) !== "clarity") {
    return null;
  }

  const analytics = toObject(siteConfig.analytics);
  const clarity = toObject(analytics.clarity);
  const config = {
    projectId: readConfigValue(clarity.project_id, "CLARITY_PROJECT_ID"),
    scriptHost:
      readConfigValue(clarity.script_host, "CLARITY_SCRIPT_HOST") ||
      "https://www.clarity.ms/tag/",
  };

  if (!config.projectId) {
    return null;
  }

  return config;
}

function listMissingClarityFields(siteConfig) {
  if (getAnalyticsProvider(siteConfig) !== "clarity") {
    return [];
  }

  const analytics = toObject(siteConfig.analytics);
  const clarity = toObject(analytics.clarity);
  const required = [["project_id", readConfigValue(clarity.project_id, "CLARITY_PROJECT_ID")]];

  return required.filter((entry) => !entry[1]).map((entry) => entry[0]);
}

function getUmamiConfig(siteConfig) {
  if (getAnalyticsProvider(siteConfig) !== "umami") {
    return null;
  }

  const analytics = toObject(siteConfig.analytics);
  const umami = toObject(analytics.umami);
  const config = {
    scriptUrl: readConfigValue(umami.script_url, "UMAMI_SCRIPT_URL"),
    websiteId: readConfigValue(umami.website_id, "UMAMI_WEBSITE_ID"),
    domains: readConfigValue(umami.domains, "UMAMI_DOMAINS"),
    hostUrl: readConfigValue(umami.host_url, "UMAMI_HOST_URL"),
    tag: readConfigValue(umami.tag, "UMAMI_TAG"),
    autoTrack: toBoolean(process.env.UMAMI_AUTO_TRACK || umami.auto_track, true),
    doNotTrack: toBoolean(
      process.env.UMAMI_DO_NOT_TRACK || umami.do_not_track,
      true
    ),
    excludeSearch: toBoolean(
      process.env.UMAMI_EXCLUDE_SEARCH || umami.exclude_search,
      false
    ),
    excludeHash: toBoolean(
      process.env.UMAMI_EXCLUDE_HASH || umami.exclude_hash,
      false
    ),
    performance: toBoolean(
      process.env.UMAMI_PERFORMANCE || umami.performance,
      false
    ),
  };

  if (!config.scriptUrl || !config.websiteId) {
    return null;
  }

  return config;
}

function listMissingUmamiFields(siteConfig) {
  const analytics = toObject(siteConfig.analytics);
  const provider = readConfigValue(analytics.provider, "ANALYTICS_PROVIDER").toLowerCase();

  if (provider !== "umami") {
    return [];
  }

  const umami = toObject(analytics.umami);
  const required = [
    ["script_url", readConfigValue(umami.script_url, "UMAMI_SCRIPT_URL")],
    ["website_id", readConfigValue(umami.website_id, "UMAMI_WEBSITE_ID")],
  ];

  return required.filter((entry) => !entry[1]).map((entry) => entry[0]);
}

function buildClarityScript(siteConfig) {
  const clarity = getClarityConfig(siteConfig);

  if (!clarity) {
    return "";
  }

  return [
    "\n<script>",
    "(function(c,l,a,r,i,t,y){",
    "  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};",
    `  t=l.createElement(r);t.async=1;t.src=${JSON.stringify(clarity.scriptHost)}+i;`,
    "  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);",
    `})(window, document, "clarity", "script", ${JSON.stringify(clarity.projectId)});`,
    "</script>",
  ].join("\n");
}

function buildUmamiScript(siteConfig) {
  const umami = getUmamiConfig(siteConfig);

  if (!umami) {
    return "";
  }

  const attrs = [
    'defer',
    `src="${escapeHTML(umami.scriptUrl)}"`,
    `data-website-id="${escapeHTML(umami.websiteId)}"`,
  ];

  if (umami.hostUrl) {
    attrs.push(`data-host-url="${escapeHTML(umami.hostUrl)}"`);
  }

  if (umami.domains) {
    attrs.push(`data-domains="${escapeHTML(umami.domains)}"`);
  }

  if (umami.tag) {
    attrs.push(`data-tag="${escapeHTML(umami.tag)}"`);
  }

  if (!umami.autoTrack) {
    attrs.push('data-auto-track="false"');
  }

  if (umami.doNotTrack) {
    attrs.push('data-do-not-track="true"');
  }

  if (umami.excludeSearch) {
    attrs.push('data-exclude-search="true"');
  }

  if (umami.excludeHash) {
    attrs.push('data-exclude-hash="true"');
  }

  if (umami.performance) {
    attrs.push('data-performance="true"');
  }

  return `\n<script ${attrs.join(" ")}></script>`;
}

function buildAnalyticsScript(siteConfig) {
  return buildClarityScript(siteConfig) || buildUmamiScript(siteConfig);
}

function buildCommentLink() {
  return '\n      <a href="#comments" class="article-comment-link"><span class="fa fa-comment">评论</span></a>';
}

function buildGiscusSection(siteConfig) {
  const giscus = getGiscusConfig(siteConfig);

  if (!giscus) {
    return "";
  }

  return [
    '',
    '<section id="comments" class="comments-panel">',
    '  <div class="comments-panel-head">',
    '    <p class="comments-panel-kicker">GitHub Discussions</p>',
    '    <h2>评论</h2>',
    '    <p class="comments-panel-note">欢迎继续交流，也可以直接在 GitHub Discussions 中参与讨论。</p>',
    '  </div>',
    '  <div class="giscus"></div>',
    '  <noscript>请启用 JavaScript 查看评论内容。</noscript>',
    '  <script src="https://giscus.app/client.js"',
    `          data-repo="${escapeHTML(giscus.repo)}"`,
    `          data-repo-id="${escapeHTML(giscus.repoId)}"`,
    `          data-category="${escapeHTML(giscus.category)}"`,
    `          data-category-id="${escapeHTML(giscus.categoryId)}"`,
    `          data-mapping="${escapeHTML(giscus.mapping)}"`,
    `          data-strict="${escapeHTML(giscus.strict)}"`,
    `          data-reactions-enabled="${escapeHTML(giscus.reactionsEnabled)}"`,
    `          data-emit-metadata="${escapeHTML(giscus.emitMetadata)}"`,
    `          data-input-position="${escapeHTML(giscus.inputPosition)}"`,
    `          data-theme="${escapeHTML(giscus.theme)}"`,
    `          data-lang="${escapeHTML(giscus.lang)}"`,
    '          crossorigin="anonymous"',
    '          async></script>',
    '</section>',
  ].join("\n");
}

function warnMissingIntegrationConfig(siteConfig) {
  const missingGiscus = listMissingGiscusFields(siteConfig);
  const analyticsProvider = getAnalyticsProvider(siteConfig);
  const missingAnalytics =
    analyticsProvider === "clarity"
      ? listMissingClarityFields(siteConfig)
      : analyticsProvider === "umami"
        ? listMissingUmamiFields(siteConfig)
        : [];

  if (missingGiscus.length) {
    hexo.log.warn(
      `[giscus] skipped because required config is missing: ${missingGiscus.join(", ")}`
    );
  }

  if (missingAnalytics.length) {
    hexo.log.warn(
      `[${analyticsProvider}] skipped because required config is missing: ${missingAnalytics.join(", ")}`
    );
  }
}

hexo.extend.injector.register(
  "head_end",
  '\n<link rel="stylesheet" href="/css/site-enhancements.css">'
);
warnMissingIntegrationConfig(hexo.config);

const analyticsScript = buildAnalyticsScript(hexo.config);

if (analyticsScript) {
  hexo.extend.injector.register("head_end", analyticsScript);
}

hexo.extend.injector.register(
  "body_end",
  '\n<script src="/js/local-search.js"></script>\n<script src="/js/site-interactions.js"></script>'
);

function toPlainText(input) {
  if (!input) {
    return "";
  }

  return unescapeHTML(stripHTML(String(input)))
    .replace(/&(nbsp|ensp|emsp|thinsp);/gi, " ")
    .replace(/&#(160|8194|8195|8201);/g, " ")
    .replace(/\u2003/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

hexo.extend.filter.register("after_post_render", function (data) {
  const descriptionSource = data.description || data.excerpt || data.content;
  const description = truncate(toPlainText(descriptionSource), 180);

  if (description) {
    data.description = description;
  }

  return data;
});

hexo.extend.filter.register("after_render:html", function (str, data) {
  let result = str;
  const page = data && data.page ? data.page : null;
  const postPage = isPostPage(data);
  const descriptionSource =
    page && (page.description || page.excerpt || page.content);
  const description = truncate(toPlainText(descriptionSource), 180);

  if (description) {
    const escapedDescription = escapeHTML(description);

    result = result.replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${escapedDescription}">`
    );
    result = result.replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${escapedDescription}">`
    );

    if (result.includes('name="twitter:description"')) {
      result = result.replace(
        /<meta name="twitter:description" content="[^"]*">/,
        `<meta name="twitter:description" content="${escapedDescription}">`
      );
    } else if (result.includes('name="twitter:card"')) {
      result = result.replace(
        /<meta name="twitter:card" content="[^"]*">/,
        `$&\n<meta name="twitter:description" content="${escapedDescription}">`
      );
    }
  }

  result = result.replace(/<img(?![^>]*\bloading=)([^>]*?)>/g, '<img loading="lazy" decoding="async"$1>');

  if (postPage && commentsAllowed(page)) {
    const giscusSection = buildGiscusSection(this.config);

    if (giscusSection) {
      if (!result.includes('class="article-comment-link"')) {
        result = result.replace(
          /(<a[^>]*class="article-share-link"[^>]*>[\s\S]*?<\/a>)/,
          `$1${buildCommentLink()}`
        );
      }

      if (!result.includes('id="comments"')) {
        result = result.replace(/<\/article>/, `</article>\n\n${giscusSection}`);
      }
    }
  }

  if (!data || !data.path || !this.config.url) {
    return result;
  }

  const canonicalUrl = buildCanonicalUrl(this.config.url, data.path);
  const headInsertions = [];

  if (postPage && !result.includes('data-schema="post-structured-data"')) {
    const structuredData = buildPostStructuredData(this.config, data, description, canonicalUrl);
    if (structuredData) {
      headInsertions.push(`  ${structuredData}`);
    }
  }

  if (!result.includes('rel="canonical"') && canonicalUrl) {
    headInsertions.push(`  <link rel="canonical" href="${canonicalUrl}">`);
  }

  if (!headInsertions.length) {
    return result;
  }

  return result.replace("</head>", `\n${headInsertions.join("\n")}\n</head>`);
});
