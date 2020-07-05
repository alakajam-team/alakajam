import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { markdown } from "server/core/templating-filters";
import { ifSet } from "server/macros/jsx-utils";
import * as sidebarMacros from "server/macros/sidebar.macros";

export default function render(context: CommonLocals) {
  const { sidebar, articleName, articleBody } = context;

  return base(context,
    <div class="container">
      <div class="row">
        {ifSet(sidebar, () =>
          <div class="col-sm-4 col-md-3">
            {sidebarMacros.sidebar(sidebar, context.path, { class: "articles-sidebar" })}
          </div>
        )}
        <div class="col-sm-8 col-md-9">
          <h1>{articleName}</h1>
          <div class="user-contents" dangerouslySetInnerHTML={markdown(articleBody)} />
        </div>
      </div>
    </div>);
}
