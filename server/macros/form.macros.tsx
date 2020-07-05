import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as templatingFilters from "server/core/templating-filters";
import { nunjuckMacro } from "./nunjucks-macros";
import { BookshelfModel } from "bookshelf";
import { Alert } from "server/types";
import { ifTrue, ifSet } from "./jsx-utils";

const FORM_MACROS_PATH = "macros/form.macros.html";

// Markdown editor

export function editor(editorName: string, editorContents: string) {
  return <textarea class="form-control easymde-editor" name={editorName}>{templatingFilters.markdownUnescape(editorContents)}</textarea>;
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
  legend?: string;
} = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "pictureInput", [name, value, options])} />;
}

// Tooltips

export function tooltip(title: string, options: { class?: string; placement?: string } = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "tooltip", [title, options])} />;
}

// Radio and check buttons

export function radio(name, value, label, modelProperty, options = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "radio", [name, value, label, modelProperty, options])} />;
}

export function check(name, label, value, options = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "check", [name, label, value, options])} />;
}

// Date time picker

export function dateTimePicker(name, value, options = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "dateTimePicker", [name, value, options])} />;
}

// Select

export function select(name, models, selectedValue, options = {}) {
  return <span dangerouslySetInnerHTML={nunjuckMacro(FORM_MACROS_PATH, "select", [name, models, selectedValue, options])} />;
}

// Alerts

export function alerts(alertsParam: Alert[]) {
  return <div id="js-alerts-inline">
    {alertsParam.map(alert =>
      ifTrue(!alert.floating, () =>
        <div class="alert alert-{{ alert.type or 'info' }}">
          {ifSet(alert.title, () => <div class="alert-title">{alert.title}</div>)}
          {alert.message}
        </div>
      ))}
  </div>;
}
