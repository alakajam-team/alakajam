import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as templatingFilters from "server/core/templating-filters";
import { Alert } from "server/types";
import slug from "slug";
import { ifFalse, ifSet, ifTrue } from "./jsx-utils";

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

/**
 * Setting options.model to any DB model is recommended to let the macro tweak the picture URL ie. prevent caching issues
 */
export function pictureInput(name: string, value: string, options: {
  model?: BookshelfModel;
  noCard?: boolean;
  defaultValue?: string;
  legend?: string;
} = {}) {
  const displayValue = value || options.defaultValue;
  return <div class={"js-picture-input " + (!options.noCard ? "card card-body" : "")}>
    <p>
      <input type="file" name={name} class="btn btn-secondary btn-block" />
      <input type="hidden" name={name} value={value} />
    </p>
    <p>
      <img class="preview js-picture-input-preview"
        src={options.model ? links.pictureUrl(displayValue, options.model) : displayValue} style={!displayValue ? "display: none" : ""} />
    </p>
    {ifSet(value, () =>
      <label><input type="checkbox" name={name + "-delete"} /> Delete picture</label>
    )}
    <div class="legend">{options.legend || "Max size: 2.0 MiB. GIFs allowed."}</div>
  </div>;
}

// Tooltips

export function tooltip(title: string, options: { class?: string; placement?: string } = {}) {
  return <span class={`"fas fa-info-circle ${options.class || "mx-1"}`}
    data-toggle="tooltip" data-placement={options.placement || "top"} title={title} style="font-size: 0.8rem"></span>;
}

// Radio and check buttons

export function radio(name, value, label, modelProperty,
                      options: { textField?: boolean; textFieldEnabled?: boolean; placeholder?: string } = {}) {
  value = options.textFieldEnabled ? modelProperty : value;
  const inputId = slug(name + "-" + value);
  return <label for={inputId}>
    <input type="radio" id={inputId} class="js-radio" name={name} value={value} checked={value && modelProperty === value} />
    {ifTrue(options.textField, () =>
      <input type="text" class="js-radio-text-field ml-1" data-target={inputId} placeholder={options.placeholder} />
    )}
    {ifFalse(options.textField, () =>
      <span class="radio-label">{label}</span>
    )}
  </label>;
}

export function check(name, label, value, options: { required?: boolean; textField?: boolean; placeholder?: string; noMargin?: boolean } = {}) {
  return <label for={name}>
    <input type="checkbox" id={name} class="js-checkbox" name={name}
      checked={Boolean(value)}
      required={options.required} />
    {ifTrue(options.textField, () =>
      <input type="text" class="js-checkbox-text-field" data-target={name} placeholder={options.placeholder} />
    )}
    {ifFalse(options.textField, () =>
      <span class="checkbox-label" style={options.noMargin ? "margin-right: 0" : ""}>{label}</span>
    )}
  </label>;
}

// Date time picker

export function dateTimePicker(name, value, user,
                               options: { pickerFormat?: string; serverFormat?: string; classes?: string; forceUTC?: boolean } = {}) {
  return <div class="form-group">
    <div class="js-date-picker input-group date" id={"datetimepicker-" + name} data-target-input="nearest"
      data-format={options.pickerFormat || "YYYY-MM-DD HH:mm"}>
      <input type="text" name={name}
        class={"form-control datetimepicker-input " + (options.classes || "")}
        value={templatingFilters.date(value, !options.forceUTC ? user : undefined, { format: options.serverFormat || "yyyy-MM-dd HH:mm" })}
        data-target={"#datetimepicker-" + name} />
      <div class="input-group-append" data-target={"#datetimepicker-" + name} data-toggle="datetimepicker">
        <div class="input-group-text"><i class="fa fa-calendar"></i></div>
      </div>
    </div>
  </div>;
}

// Select

export function select(name, models, selectedValue, options: { nullable?: boolean } = {}) {
  return <select name={name} class="js-select form-control">
    {ifTrue(options.nullable, () =>
      <option value="" selected={!selectedValue}></option>
    )}
    {models.map(model =>
      <option value={model.get("id")} selected={selectedValue === model.get("id")}>
        {model.get("title")}
      </option>
    )}
  </select>;
}

// Alerts

export function alerts(alertsParam: Alert[]) {
  return <div id="js-alerts-inline">
    {alertsParam.map(alert =>
      ifTrue(!alert.floating, () =>
        <div class={`alert alert-${alert.type || "info"}`}>
          {ifSet(alert.title, () => <div class="alert-title">{alert.title}</div>)}
          {alert.message}
        </div>
      ))}
  </div>;
}
