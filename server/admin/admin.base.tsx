import * as React from "preact";
import { render } from "preact-render-to-string";
import { CommonLocals } from "server/common.middleware";
import { NUNJUCKS_ENV } from "server/core/middleware";

export default function adminBase<T extends CommonLocals>(context: T, contentsBlock: JSX.Element) {
  const html = NUNJUCKS_ENV.renderString(`
    {% extends "admin/admin.base.html" %}

    {% block adminBody %}
      ${render(contentsBlock, context)}
    {% endblock %}
  `, context);
  const htmlWithoutRootTag = html.replace(/^[\s\n]*<\!doctype html>[\s\n]*<html lang="en">/g, "").replace(/<\/html>[\s\n]*$/g, "");
  return <html lang="en" dangerouslySetInnerHTML={{ __html: htmlWithoutRootTag }} />;
}
