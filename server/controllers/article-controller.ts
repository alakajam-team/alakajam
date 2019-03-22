
/**
 * Article pages
 *
 * @module controllers/article-controller
 */

import * as slug from "slug";
import articleService from "../services/article-service";
import settingService from "../services/setting-service";

export default {
  api,
  article,
};

/**
 * Articles
 */
async function api(req, res) {
  _renderArticle("api", res);
}

async function article(req, res) {
  _renderArticle(slug(req.params.name), res);
}

async function _renderArticle(name, res) {
  res.locals.articleName = name;

  // Find featured article
  const findArticleTask = articleService.findArticle(
    res.locals.articleName,
  ).then(async function(article) {
    if (article) {
      const lines = article.split("\n");
      res.locals.articleName = lines.shift();
      res.locals.articleBody = lines.join("\n");
    }
  });

  const settingArticlesTask = settingService.findArticlesSidebar()
    .then(function(sidebar) {
      res.locals.sidebar = sidebar;
    });

  await Promise.all([findArticleTask, settingArticlesTask]); // Parallelize fetching everything

  if (res.locals.articleName && res.locals.articleBody) {
    res.locals.pageTitle = res.locals.articleName;
    res.render("article");
  } else if (name !== "docs") {
    res.redirect("/article/docs");
  } else {
    res.errorPage(404);
  }
}
