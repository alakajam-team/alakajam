import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { prettyDump } from "server/core/templating-filters";

export default function render(context: CommonLocals & { json: string; apiPath: string }) {
  context.inlineStyles.push(`
    .parameter {
      padding-right: 10px;
      vertical-align: top
    }
    .parameter-description {
      font-size: 0.85rem;
    }
  `);

  const { apiPath, json } = context;

  return base(context, <div class="container">
    <h1>{apiPath}</h1>
    <p><a href="/api">View API documentation</a></p>
    <div dangerouslySetInnerHTML={prettyDump(json)} />
  </div>);
}
