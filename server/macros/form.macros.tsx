import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as templatingFilters from "server/core/templating-filters";

export function registerCodeMirrorScripts(locals: CommonLocals) {
  locals.scripts.push(
    links.staticUrl("/static/scripts/codemirror.min.js"),
    links.staticUrl("/static/scripts/matchbrackets.min.js"),
    links.staticUrl("/static/scripts/closebrackets.min.js"),
    links.staticUrl("/static/scripts/codemirror-jsonconf.min.js"),
    links.staticUrl("/static/scripts/codemirror-autorefresh.min.js")
  );
}

export function registerEditorScripts(locals: CommonLocals) {
  locals.scripts.push(links.staticUrl("/static/scripts/easymde.min.js"));
}

export function editor(editorName: string, editorContents: string) {
  return <textarea class="form-control easymde-editor" name={ editorName }>{ templatingFilters.markdownUnescape(editorContents) }</textarea>;
}
