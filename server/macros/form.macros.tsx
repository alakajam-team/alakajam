import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as templatingFilters from "server/core/templating-filters";
import { User } from "server/entity/user.entity";
import { Alert } from "server/types";
import slug from "slug";
import { ifFalse, ifSet, ifTrue } from "./jsx-utils";

// Markdown editor

/**
 * Requires registration of scripts with `formMacros.registerEditorScripts(context)` to function
 */
export function editor(editorName: string, editorContents: string, options: { minHeight?: number; autofocus?: boolean } = {}): JSX.Element {
  return <div class="EasyMDEContainer">
    <textarea class="form-control easymde-editor"
      name={editorName}
      data-min-height={ifSet(options.minHeight, () => options.minHeight + "px")}
      autofocus={options.autofocus}
    >{templatingFilters.markdownUnescape(editorContents)}</textarea>
  </div>;
}

export function registerEditorScripts(locals: CommonLocals): void {
  locals.scripts.push(links.staticUrl("/static/scripts/easymde.min.js"));
}

// Codemirror editor

export function registerCodeMirrorScripts(locals: CommonLocals): void {
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
} = {}): JSX.Element {
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

export function tooltip(title: string, options: { class?: string; placement?: string } = {}): JSX.Element {
  return <span class={`fas fa-info-circle ${options.class || "mx-1"}`}
    data-toggle="tooltip" data-placement={options.placement || "top"} title={title} style="font-size: 0.8rem"></span>;
}

// Radio and check buttons

export function radio(name: string, value: string, label: string, modelProperty: string,
  options: { textField?: boolean; textFieldEnabled?: boolean; placeholder?: string } = {}): JSX.Element {
  value = options.textFieldEnabled ? modelProperty : value;
  const inputId = slug(name + "-" + value);
  return <label for={inputId}>
    <input type="radio" id={inputId} class="js-radio" name={name} value={value} checked={Boolean(value && modelProperty === value)} />
    {ifTrue(options.textField, () =>
      <input type="text" class="js-radio-text-field ml-1" data-target={inputId} placeholder={options.placeholder} />
    )}
    {ifFalse(options.textField, () =>
      <span class="radio-label">{label}</span>
    )}
  </label>;
}

export function check(name: string, label: string, value: boolean,
  options: { required?: boolean; textField?: boolean; placeholder?: string; noMargin?: boolean } = {}): JSX.Element {
  return <label for={name}>
    <input type="checkbox" id={name} class="js-checkbox" name={name}
      checked={Boolean(value)}
      required={options.required} />{" "}
    {ifTrue(options.textField, () =>
      <input type="text" class="js-checkbox-text-field" data-target={name} placeholder={options.placeholder} />
    )}
    {ifFalse(options.textField, () =>
      <span class="checkbox-label" style={options.noMargin ? "margin-right: 0" : ""}>{label}</span>
    )}
  </label>;
}

// Date time picker

/**
 * Requires registration of scripts with `formMacros.registerDatePickerScripts(context)` to function
 */
export function dateTimePicker(name: string, value: string, user: User,
  options: { pickerFormat?: string; serverFormat?: string; classes?: string; forceUTC?: boolean } = {}): JSX.Element {
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

export function registerDatePickerScripts(locals: CommonLocals): void {
  locals.scripts.push(
    links.staticUrl("/static/scripts/moment.min.js"),
    links.staticUrl("/static/scripts/tempusdominus-bootstrap-4.min.js")
  );
}

// Select

export function select(name: string, models: BookshelfModel[], selectedValue: string, options: { nullable?: boolean } = {}): JSX.Element {
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

export function alerts(alertsParam: Alert[]): JSX.Element {
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
