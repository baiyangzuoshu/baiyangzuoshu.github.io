(function ($) {
  if (!$) return;

  var $body = $("body");

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

  function closeShareBoxes() {
    $(".article-share-box.on").removeClass("on").hide();
  }

  function updateStatus($box, message) {
    $box.find(".article-share-status").text(message || "");
  }

  function createShareBox(id, url) {
    return $(
      [
        '<div id="' + escapeHtml(id) + '" class="article-share-box article-share-box--custom" role="dialog" aria-label="分享文章">',
        '  <input class="article-share-input" readonly value="' + escapeHtml(url) + '">',
        '  <div class="article-share-links">',
        '    <button type="button" class="article-share-action article-share-copy">复制链接</button>',
        '    <button type="button" class="article-share-action article-share-native">系统分享</button>',
        "  </div>",
        '  <div class="article-share-status" aria-live="polite"></div>',
        "</div>",
      ].join("")
    );
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    var $temp = $('<input type="text" class="article-share-temp">').val(text).appendTo($body);
    var node = $temp.get(0);
    node.focus();
    node.select();

    try {
      document.execCommand("copy");
    } finally {
      $temp.remove();
    }
  }

  function placeShareBox($box, $trigger) {
    var triggerOffset = $trigger.offset() || { top: 0, left: 0 };
    var boxWidth = Math.min(320, $(window).width() - 24);
    var maxLeft = $(window).scrollLeft() + $(window).width() - boxWidth - 12;
    var left = triggerOffset.left + $trigger.outerWidth() - boxWidth;

    left = Math.max(12, Math.min(left, maxLeft));

    $box.css({
      top: triggerOffset.top + $trigger.outerHeight() + 10,
      left: left,
      width: boxWidth,
    });
  }

  $body.off("click", ".article-share-link");
  $body.off("click", ".article-share-box");
  $body.off("click", ".article-share-box-input");
  $body.off("click", ".article-share-box-link");

  $body.on("click.siteShare", ".article-share-link", async function (event) {
    event.preventDefault();
    event.stopPropagation();

    var $trigger = $(this);
    var url = $trigger.attr("data-url") || window.location.href;
    var title = $trigger.attr("data-title") || document.title;

    if (navigator.share && window.matchMedia("(max-width: 767px)").matches) {
      try {
        await navigator.share({ title: title, url: url });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
      }
    }

    var id = "article-share-box-" + ($trigger.attr("data-id") || "default");
    var $box = $("#" + id);
    var wasOpen = $box.length && $box.hasClass("on");

    closeShareBoxes();
    if (wasOpen) return;

    if (!$box.length) {
      $box = createShareBox(id, url);
      $body.append($box);
    }

    $box.find(".article-share-input").val(url);
    $box.find(".article-share-native").toggleClass("is-hidden", !navigator.share);
    updateStatus($box, "");
    placeShareBox($box, $trigger);
    $box.show().addClass("on");
  });

  $body.on("click.siteShare", ".article-share-box", function (event) {
    event.stopPropagation();
  });

  $body.on("click.siteShare", ".article-share-input", function () {
    this.select();
  });

  $body.on("click.siteShare", ".article-share-copy", async function (event) {
    event.preventDefault();
    event.stopPropagation();

    var $box = $(this).closest(".article-share-box");
    var url = $box.find(".article-share-input").val();

    try {
      await copyText(url);
      updateStatus($box, "链接已复制");
    } catch (error) {
      updateStatus($box, "复制失败，请手动复制");
    }
  });

  $body.on("click.siteShare", ".article-share-native", async function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (!navigator.share) return;

    var $box = $(this).closest(".article-share-box");
    var url = $box.find(".article-share-input").val();

    try {
      await navigator.share({ title: document.title, url: url });
      closeShareBoxes();
    } catch (error) {
      if (error && error.name !== "AbortError") {
        updateStatus($box, "系统分享暂时不可用");
      }
    }
  });

  $(document).on("click.siteShare", function () {
    closeShareBoxes();
  });
})(window.jQuery);
