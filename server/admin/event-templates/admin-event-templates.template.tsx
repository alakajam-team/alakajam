import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import * as eventManageMacros from "server/event/manage/event-manage.macros";
import * as formMacros from "server/macros/form.macros";
import adminBase, { AdminBaseContext } from "../admin.base";

export interface AdminEventContext extends AdminBaseContext {
  eventTemplates: BookshelfModel[];
  eventPresets: BookshelfModel[];
  editEventTemplate: BookshelfModel;
}

export function adminEventTemplatesTemplate(context: AdminEventContext) {
  formMacros.registerCodeMirrorScripts(context);

  const { editEventTemplate, eventTemplates, eventPresets, csrfTokenJSX } = context;

  return adminBase(context,
    <div>
      <h1>Event templates</h1>

      {actions(editEventTemplate)}
      {editForm(editEventTemplate, eventPresets, csrfTokenJSX)}
      {table(eventTemplates)}
    </div>

  );
}

function actions(editEventTemplate) {
  if (!editEventTemplate) {
    return <div>
      <p>These templates allow to create an event with more sensible defaults.</p>
      <p>
        <a href="?create" class="btn btn-primary">Create template</a>
      </p>
    </div>;
  }
}

function editForm(eventTemplate: BookshelfModel, eventPresets: BookshelfModel[], csrfTokenJSX: () => JSX.Element) {
  if (eventTemplate) {
    return <div class="card card-body">
      <h2><span id="template-header"></span> event template</h2>
      <form method="post" action="?">
        {csrfTokenJSX()}
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" required class="form-control js-sync-text" name="title" value={eventTemplate.get("title")}
            data-sync-text-display-selector="#template-header" data-sync-text-default="New" />
        </div>
        <div class="form-group">
          <label for="title">Default event title</label>
          <input type="text" class="form-control" name="event-title" value={eventTemplate.get("event_title")} />
        </div>
        <div class="form-group">
          <label for="logo">Preset</label>
          <select name="event-preset-id" class="js-select" style="width: 100%" data-placeholder="None" data-allow-clear="true">
            <option value=""></option>
            {eventPresetsOptions(eventTemplate, eventPresets)}
          </select>
        </div>
        {eventManageMacros.linksForm(eventTemplate)}
        {eventManageMacros.jamConfigForm(eventTemplate, eventTemplate)}
        <div class="form-group">
          {deleteButton(eventTemplate)}
          <button name="save" type="submit" class="btn btn-primary mr-1">Save</button>
          <a href="?" class="btn btn-outline-primary">Cancel</a>
        </div>
      </form>
    </div>;
  }
}

function deleteButton(eventTemplate: BookshelfModel) {
  if (eventTemplate.get("id")) {
    return <div class="float-right">
      <input type="hidden" name="id" value={eventTemplate.get("id")} />
      <button type="submit" class="btn btn-danger" name="delete" onClick={() => confirm("Delete this template?")}>Delete</button>
    </div>;
  }
}

function eventPresetsOptions(eventTemplate: BookshelfModel, eventPresets: BookshelfModel[]) {
  const eventPresetOptions = [];
  eventPresetOptions.forEach((eventPreset) => {
    eventPresetOptions.push(
      <option value={eventPreset.get("id")}
        selected={eventTemplate.get("event_preset_id") === eventPreset.get("id")}>
        {eventPreset.get("title")}
      </option>);
  });
  return eventPresetOptions;
}

function table(eventTemplates: BookshelfModel[]) {
  const rows = [];
  for (const eventTemplate of eventTemplates) {
    rows.push(<tr>
      <td>{eventTemplate.get("title")}</td>
      <td>
        <a href={"?edit=" + eventTemplate.get("id")} class="btn btn-primary">Edit</a>
      </td>
    </tr>);
  }

  return <table class="table">
    <thead>
      <tr>
        <th>Title</th>
        <th style="width: 100px">Actions</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>;
}
