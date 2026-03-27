hexo.extend.filter.register("before_generate", function () {
  if (!this.theme || !this.theme.config) {
    return;
  }

  this.theme.config.menu = {
    首页: "/",
    归档: "/archives",
  };
});
