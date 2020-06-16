
/**
 * Article pages
 */

import { CommonLocals } from "server/common.middleware";
import settings from "server/core/settings";
import { CustomRequest, CustomResponse } from "server/types";
import * as slug from "slug";
import articleService from "./article.service";

export async function articleApiRoot(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  return renderArticle(res, "docs", "api");
}

export async function articleView(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const category = slug(req.params.category || "");
  const name = slug(req.params.name || "");

  if (["about", "docs"].includes(category)) {
    const validCategory = category as "about" | "docs";

    if (name) {
      return renderArticle(res, validCategory, name);
    } else {
      // Redirect to the first article by default
      const categorySidebar = await settings.findArticlesSidebar(validCategory);
      const firstArticlePathElements = categorySidebar[0]?.links[0]?.url.split("/");
      const firstArticleName = firstArticlePathElements[firstArticlePathElements.length - 1];
      if (firstArticleName) {
        return res.redirect(`/article/${validCategory}/${firstArticleName}`);
      }
    }

  }

  res.errorPage(404);
}

async function renderArticle(
  res: CustomResponse<CommonLocals>,
  category: "about" | "docs",
  name: string): Promise<void> {

  // Find featured article
  const findArticleTask = articleService.findArticle(
    name,
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
  } else {
    res.errorPage(404);
  }
}
