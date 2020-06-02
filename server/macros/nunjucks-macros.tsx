import { NUNJUCKS_ENV } from "server/core/middleware";
import * as React from "preact";

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
