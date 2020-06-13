import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { EditableSetting } from "server/core/settings-keys";
import * as templatingFilters from "server/core/templating-filters";
import * as formMacros from "server/macros/form.macros";
import { ifSet } from "server/macros/jsx-utils";
import adminBase from "../admin.base";

export type EditableSettingInstance = EditableSetting & { value: string };

export interface AdminSettingsContext extends CommonLocals {
  settings: EditableSettingInstance[];
  editSetting: EditableSettingInstance;
}

export function adminSettingsTemplate(context: AdminSettingsContext) {
  formMacros.registerCodeMirrorScripts(context);
  formMacros.registerEditorScripts(context);

  return adminBase(context,
    <div>
      <h1>Settings</h1>
      {ifSet(context.editSetting, () => edit(context.editSetting, context.csrfTokenJSX))}
      {list(context.settings)}
    </div>);
}

function edit(setting: EditableSettingInstance, csrfTokenJSX: Function) {
  return <form action="/admin/settings" method="post" class="card">
    <div class="card-header">
      <h2>{setting.key}</h2>
      <p>{setting.description}</p>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label for="value">Value</label>
        {editSetting(setting)}
      </div>
      <div class="form-group">
        {csrfTokenJSX()}
        <input type="hidden" name="key" value={setting.key} class="form-control" />
        <input type="submit" class="btn btn-primary" value="Save" />
      </div>
    </div>
  </form>;
}

function editSetting(setting: EditableSettingInstance) {
  if (setting.isMarkdown) {
    return formMacros.editor("value", setting.value);
  } else {
    return <textarea name="value" class={"form-control" + setting.isJson ? "json-setting codemirror" : ""}>{setting.value}</textarea>;
  }
}

function list(settings: EditableSettingInstance[]) {
  const rows = [];
  let currentCategory = "";

  settings.forEach(setting => {
    if (setting.category !== currentCategory) {
      currentCategory = setting.category;
      rows.push(<tr>
        <td colspan="3"><h2>{currentCategory}</h2></td>
      </tr>);
    }

    rows.push(<tr>
      <td>
        {setting.key}<br />
        <span class="legend">{setting.description}</span>
      </td>
      <td style="width: 50%">
        {viewSetting(setting)}
      </td>
      <td><a class="btn btn-primary btn-sm" href={"?edit=" + setting.key}>Edit</a></td>
    </tr>);
  });

  return <table class="table">
    <thead>
      <th>Setting</th>
      <th>Value</th>
      <th></th>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>;
}

function viewSetting(setting: EditableSettingInstance) {
  if (setting.isMarkdown) {
    return <div class="card" dangerouslySetInnerHTML={templatingFilters.markdown(setting.value)}></div>;
  } else if (setting.isJson) {
    return <textarea class="codemirror" readonly>{setting.value}</textarea>;
  } else if (setting.value) {
    return <code style="max-width: 500px">{setting.value}</code>;
  } else {
    return <i>(empty)</i>;
  }
}
