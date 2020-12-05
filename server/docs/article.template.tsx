import React, { JSX } from "preact";
import base from "server/base.template";
import { markdown } from "server/core/templating-filters";
import { ifSet } from "server/macros/jsx-utils";
import * as sidebarMacros from "server/docs/components/article-sidebar.component";
import { ArticleContext } from "./article.controller";

export default function render(context: ArticleContext): JSX.Element {
  const { sidebar, articleName, articleTitle, articleBody } = context;

  return base(context,
    <div class="container">
      <div class="row">
        {ifSet(sidebar, () =>
          <div class="col-sm-4 col-md-3">
            {sidebarMacros.sidebar(sidebar, context.path, { class: "articles-sidebar" })}
          </div>
        )}
        <div class="col-sm-8 col-md-9">
          <h1>
            {articleTitle}
            <a class="btn btn-outline-primary btn-sm float-lg-right"
              href={`https://github.com/alakajam-team/alakajam/blob/master/server/docs/article-data/${articleName}.md`}>
              <span class="fab fa-github mr-1"></span>
              Contribute&nbsp;to&nbsp;this&nbsp;page
            </a>
          </h1>
          <div class="user-contents" dangerouslySetInnerHTML={markdown(articleBody)} />
        </div>
      </div>
    </div>);
}
