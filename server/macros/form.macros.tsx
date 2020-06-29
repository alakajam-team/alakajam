import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as templatingFilters from "server/core/templating-filters";
import { nunjuckMacro } from "./nunjucks-macros";
import { BookshelfModel } from "bookshelf";

const FORM_MACROS_PATH = "macros/form.macros.html";

// Markdown editor

export function editor(editorName: string, editorContents: string) {
  return <textarea class="form-control easymde-editor" name={ editorName }>{ templatingFilters.markdownUnescape(editorContents) }</textarea>;
}

export function registerEditorScripts(locals: CommonLocals) {
  locals.scripts.push(links.staticUrl("/static/scripts/easymde.min.js"));
}

// Codemirror editor

export function registerCodeMirrorScripts(locals: CommonLocals) {
  locals.scripts.push(
    links.staticUrl("/static/scripts/codemirror.min.js"),
    links.staticUrl("/static/scripts/matchbrackets.min.js"),
    links.staticUrl("/static/scripts/closebrackets.min.js"),
    links.staticUrl("/static/scripts/codemirror-jsonconf.min.js"),
    links.staticUrl("/static/scripts/codemirror-autorefresh.min.js")
  );
}

// Pictures

export function pictureInput(name: string, value: string, options: {
  model?: BookshelfModel;
  noCard?: boolean;
  defaultValue?: string;
  legend?: string
} = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "pictureInput", [name, value, options])} />;
}

// Tooltips

export function tooltip(title: string, options: { class?: string, placement?: string } = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "tooltip", [title, options])} />;
}

// Radio and check buttons
// TODO

// Date time picker
// TODO

// Select
// TODO

// Alerts
// TODO