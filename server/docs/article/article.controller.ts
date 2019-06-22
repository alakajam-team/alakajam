
/**
 * Article pages
 *
 * @module controllers/article-controller
 */

import settings from "server/core/settings";
import articleService from "server/docs/article.service";
import * as slug from "slug";

export async function articleApiRoot(req, res) {
  _renderArticle("api", res);
}

export function articleView(req, res) {
  _renderArticle(slug(req.params.name), res);
}

async function _renderArticle(name, res) {
  res.locals.articleName = name;

  // Find featured article
  const findArticleTask = articleService.findArticle(
    res.locals.articleName,
  ).then(async (article) => {
    if (article) {
      const lines = article.split("\n");
      res.locals.articleName = lines.shift();
      res.locals.articleBody = lines.join("\n");
    }
  });

  const settingArticlesTask = settings.findArticlesSidebar()
    .then((sidebar) => {
      res.locals.sidebar = sidebar;
    });

  await Promise.all([findArticleTask, settingArticlesTask]); // Parallelize fetching everything

  if (res.locals.articleName && res.locals.articleBody) {
    res.locals.pageTitle = res.locals.articleName;
    res.render("docs/article/article");
  } else if (name !== "docs") {
    res.redirect("/article/docs");
  } else {
    res.errorPage(404);
  }
}
