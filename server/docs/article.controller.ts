
/**
 * Article pages
 */

import { CommonLocals } from "server/common.middleware";
import settings, { ArticleSidebarCategory } from "server/core/settings";
import { CustomRequest, CustomResponse } from "server/types";
import slug from "slug";
import articleService from "./article.service";

export interface ArticleContext extends CommonLocals {
  sidebar: ArticleSidebarCategory;
  articleName: string;
  articleBody: string;
}

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
  const context: ArticleContext = {
    ...res.locals,
    sidebar: undefined,
    articleName: undefined,
    articleBody: undefined
  };

  // Find featured article
  const findArticleTask = articleService.findArticle(
    name,
  ).then(async (article) => {
    if (article) {
      const lines = article.split("\n");
      context.articleName = lines.shift();
      context.articleBody = lines.join("\n");
    }
  });

  const settingArticlesTask = settings.findArticlesSidebar(category)
    .then((sidebar) => context.sidebar = sidebar);

  await Promise.all([findArticleTask, settingArticlesTask]); // Parallelize fetching everything

  if (context.articleName && context.articleBody) {
    context.pageTitle = context.articleName;
    res.render<ArticleContext>("docs/article", context);
  } else {
    res.errorPage(404);
  }
}
