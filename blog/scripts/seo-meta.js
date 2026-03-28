const { escapeHTML, stripHTML, truncate, unescapeHTML } = require("hexo-util");

hexo.extend.injector.register(
  "head_end",
  '\n<link rel="stylesheet" href="/css/site-enhancements.css">'
);
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

  if (!data || !data.path || !this.config.url || result.includes('rel="canonical"')) {
    return result;
  }

  let canonicalPath = data.path.replace(/index\.html$/, "");
  if (canonicalPath && !canonicalPath.startsWith("/")) {
    canonicalPath = `/${canonicalPath}`;
  }

  const baseUrl = this.config.url.endsWith("/")
    ? this.config.url
    : `${this.config.url}/`;
  const canonicalUrl = new URL(canonicalPath.replace(/^\//, ""), baseUrl).toString();

  return result.replace(
    "</head>",
    `\n  <link rel="canonical" href="${canonicalUrl}">\n</head>`
  );
});
