
/**
 * Article pages
 *
 * @module controllers/article-controller
 */

import { Request } from "express";
import settings from "server/core/settings";
import { GlobalLocals } from "server/global.middleware";
import { CustomResponse } from "server/types";
import * as slug from "slug";
import articleService from "./article.service";

export async function articleApiRoot(req: Request, res: CustomResponse<GlobalLocals>): Promise<void> {
  return _renderArticle(res, "docs", "api");
}

export async function articleView(req: Request, res: CustomResponse<GlobalLocals>): Promise<void> {
  return _renderArticle(res, slug(req.params.category), slug(req.params.name || ""));
}

async function _renderArticle(
    res: CustomResponse<GlobalLocals>,
    category: "about" | "docs",
    name: string): Promise<void> {
  res.locals.articleName = name || category;

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

  const settingArticlesTask = settings.findArticlesSidebar(category)
    .then((sidebar) => res.locals.sidebar = sidebar);

  await Promise.all([findArticleTask, settingArticlesTask]); // Parallelize fetching everything

  if (res.locals.articleName && res.locals.articleBody) {
    res.locals.pageTitle = res.locals.articleName;
    res.render("docs/article");
  } else if (res.locals.articleName !== category) {
    // Redirect to category root if article is not found
    res.redirect(`/article/${category}`);
  } else {
    res.errorPage(404);
  }
}
