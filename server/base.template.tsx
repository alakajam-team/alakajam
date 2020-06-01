import * as React from "preact";
import { render } from "preact-render-to-string";
import { CommonLocals } from "./common.middleware";
import { NUNJUCKS_ENV } from "./core/middleware";

export default function base<T extends CommonLocals>(context: T, contentsBlock: JSX.Element) {
  const html = NUNJUCKS_ENV.renderString(`
    {% extends "base.html" %}

    {% block styles %}
      ${context.inlineStyles.map(inlineStyle => `<style type="text/css">${inlineStyle}</style>`).join("\n")}
    {% endblock %}

    {% block body %}
      ${render(contentsBlock, context)}
    {% endblock %}

    {% block scripts %}
      ${context.scripts.map(scriptUrl => `<script type="text/javascript" src="${ scriptUrl }"></script>`)}
    {% endblock %}
  `, context);

  const htmlWithoutRootTag = html.replace(/^[\s\n]*<\!doctype html>[\s\n]*<html lang="en">/g, "").replace(/<\/html>[\s\n]*$/g, "");
  return <html lang="en" dangerouslySetInnerHTML={{ __html: htmlWithoutRootTag }} />;
}
