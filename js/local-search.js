(function ($) {
  if (!$) return;

  var $wrap = $("#search-form-wrap");
  var $form = $wrap.find(".search-form");
  var $input = $wrap.find(".search-form-input");

  if (!$wrap.length || !$form.length || !$input.length) return;

  var $panel = $('<div class="search-result-panel" aria-live="polite"></div>');
  var searchIndexPromise;
  var searchSerial = 0;

  $wrap.append($panel);
  $form.attr({ action: "#", autocomplete: "off" });
  $input.attr({ placeholder: "站内搜索", "aria-label": "站内搜索" });
  $input.off("blur");

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalize(value) {
    return String(value || "").toLowerCase();
  }

  function buildSnippet(content, query) {
    var source = String(content || "").replace(/\s+/g, " ").trim();
    if (!source) return "";

    var normalizedSource = normalize(source);
    var normalizedQuery = normalize(query);
    var index = normalizedSource.indexOf(normalizedQuery);
    var start = index === -1 ? 0 : Math.max(0, index - 30);
    var end = index === -1 ? Math.min(source.length, 120) : Math.min(source.length, index + query.length + 60);
    var snippet = source.slice(start, end);

    if (start > 0) snippet = "…" + snippet;
    if (end < source.length) snippet += "…";

    var safeSnippet = escapeHtml(snippet);
    if (!normalizedQuery) return safeSnippet;

    return safeSnippet.replace(new RegExp(escapeRegExp(query), "gi"), function (match) {
      return "<mark>" + match + "</mark>";
    });
  }

  function closeSearch() {
    $wrap.removeClass("show-results on");
  }

  function renderMessage(message) {
    $panel.html('<div class="search-result-empty">' + message + "</div>");
    $wrap.addClass("show-results on");
  }

  function loadIndex() {
    if (!searchIndexPromise) {
      searchIndexPromise = fetch("/search.json").then(function (response) {
        if (!response.ok) {
          throw new Error("Search index unavailable");
        }
        return response.json();
      });
    }

    return searchIndexPromise;
  }

  function rankItem(item, tokens) {
    var title = normalize(item.title);
    var content = normalize(item.content);
    var score = 0;

    tokens.forEach(function (token) {
      if (!token) return;
      if (title.indexOf(token) !== -1) score += 6;
      if (content.indexOf(token) !== -1) score += 2;
    });

    return score;
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  function renderResults(items, query) {
    if (!items.length) {
      renderMessage('没有找到与 “' + escapeHtml(query) + "” 相关的内容");
      return;
    }

    var html = ['<ul class="search-result-list">'];

    items.forEach(function (item) {
      var title = escapeHtml(item.title || "未命名文章");
      var url = escapeHtml(item.url || item.path || "#");
      var snippet = buildSnippet(item.content, query);

      html.push('<li class="search-result-item">');
      html.push('<a href="' + url + '">');
      html.push('<span class="search-result-title">' + title + "</span>");
      if (snippet) {
        html.push('<span class="search-result-snippet">' + snippet + "</span>");
      }
      html.push("</a>");
      html.push("</li>");
    });

    html.push("</ul>");
    $panel.html(html.join(""));
    $wrap.addClass("show-results on");
  }

  async function performSearch() {
    var query = $input.val().trim();
    var currentSerial = ++searchSerial;

    if (!query) {
      $panel.empty();
      $wrap.removeClass("show-results");
      return;
    }

    renderMessage("搜索中…");

    try {
      var data = await loadIndex();
      if (currentSerial !== searchSerial) return;

      var tokens = normalize(query).split(/\s+/).filter(Boolean);
      var results = data
        .map(function (item) {
          item._score = rankItem(item, tokens);
          return item;
        })
        .filter(function (item) {
          return item._score > 0;
        })
        .sort(function (a, b) {
          return b._score - a._score;
        })
        .slice(0, 8);

      renderResults(results, query);
    } catch (error) {
      if (currentSerial !== searchSerial) return;
      renderMessage("搜索索引加载失败");
    }
  }

  $form.on("submit", function (event) {
    event.preventDefault();
    performSearch();
  });

  $input.on("input", debounce(performSearch, 120));
  $input.on("focus", function () {
    if ($panel.children().length) {
      $wrap.addClass("show-results on");
    }
  });
  $input.on("keydown", function (event) {
    if (event.key === "Escape") {
      closeSearch();
      this.blur();
    }
  });

  $(document).on("mousedown", function (event) {
    if ($(event.target).closest("#search-form-wrap, .nav-search-btn").length) return;
    closeSearch();
  });
})(window.jQuery);
