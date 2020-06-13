import { NUNJUCKS_ENV } from "server/core/middleware";
import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { render } from "preact-render-to-string";

export function nunjuckMacro(filePath: string, functionName: string, parameters: any[] = []): { __html: string } {
  const html = NUNJUCKS_ENV.renderString(`
    {% import "${filePath}" as macros %}
    {{ macros.${functionName}(${parameters.map((key, index) => `parameters[${index}]`).join(', ') }) }}
    `, { parameters });
  return { __html: html };
}

export function collectHtml(htmlList: Array<{ __html: string }>): { __html: string } {
  return { __html: htmlList.map(html => html.__html).join('\n') };
}

export function collectHtmlAsDiv(htmlList: Array<{ __html: string }>): JSX.Element {
  return <div dangerouslySetInnerHTML={ collectHtml(htmlList) }></div>;
}

export function renderInBaseTemplate(filePath: string, context: CommonLocals, contentsBlockName: string, contentsBlock: JSX.Element) {
  const html = NUNJUCKS_ENV.renderString(`
    {% extends "${filePath}" %}

    {% block styles %}
      ${context.inlineStyles.map(inlineStyle => `<style type="text/css">${inlineStyle}</style>`).join("\n")}
    {% endblock %}

    {% block ${contentsBlockName} %}
      ${render(contentsBlock, context)}
    {% endblock %}

    {% block scripts %}
      ${context.scripts.map(scriptUrl => `<script type="text/javascript" src="${ scriptUrl }"></script>`)}
    {% endblock %}
  `, context);

  const htmlWithoutRootTag = html.replace(/^[\s\n]*<\!doctype html>[\s\n]*<html lang="en">/g, "").replace(/<\/html>[\s\n]*$/g, "");
  return <html lang="en" dangerouslySetInnerHTML={{ __html: htmlWithoutRootTag }} />;
}
