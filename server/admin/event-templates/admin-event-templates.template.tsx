import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import * as eventManageMacros from "server/event/manage/event-manage.macros";
import * as formMacros from "server/macros/form.macros";
import { ifSet } from "server/macros/jsx-utils";
import adminBase, { AdminBaseContext } from "../admin.base";

export interface AdminEventContext extends AdminBaseContext {
  eventTemplates: BookshelfModel[];
  eventPresets: BookshelfModel[];
  editEventTemplate: BookshelfModel;
}

export function adminEventTemplatesTemplate(context: AdminEventContext) {
  formMacros.registerCodeMirrorScripts(context);

  return adminBase(context,
    <div>
      <h1>Event templates</h1>

      {context.editEventTemplate
        ? edit(context.editEventTemplate, context.eventPresets, context.csrfTokenJSX)
        : actions()}
      {list(context.eventTemplates)}
    </div>

  );
}

function actions() {
  return <div>
    <p>These templates allow to create an event with more sensible defaults.</p>
    <p>
      <a href="?create" class="btn btn-primary">Create template</a>
    </p>
  </div>;
}

function edit(eventTemplate: BookshelfModel, eventPresets: BookshelfModel[], csrfTokenJSX: () => JSX.Element) {
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
            {eventPresets.map((eventPreset) =>
              <option value={eventPreset.get("id")}
                selected={eventTemplate.get("event_preset_id") === eventPreset.get("id")}>
                {eventPreset.get("title")}
              </option>
            )}
          </select>
        </div>
        {eventManageMacros.linksForm(eventTemplate)}
        {eventManageMacros.jamConfigForm(eventTemplate, eventTemplate)}
        <div class="form-group">
          {ifSet(eventTemplate.get("id"), () =>
            <div class="float-right">
              <input type="hidden" name="id" value={eventTemplate.get("id")} />
              <button type="submit" class="btn btn-danger" name="delete" onclick="return confirm('Delete this template?')">Delete</button>
            </div>)}
          <button name="save" type="submit" class="btn btn-primary mr-1">Save</button>
          <a href="?" class="btn btn-outline-primary">Cancel</a>
        </div>
      </form>
    </div>;
  }
}

function list(eventTemplates: BookshelfModel[]) {
  return <table class="table">
    <thead>
      <tr>
        <th>Title</th>
        <th style="width: 100px">Actions</th>
      </tr>
    </thead>
    <tbody>
      {eventTemplates.map(eventTemplate =>
        <tr>
          <td>{eventTemplate.get("title")}</td>
          <td>
            <a href={"?edit=" + eventTemplate.get("id")} class="btn btn-primary">Edit</a>
          </td>
        </tr>)}
    </tbody>
  </table>;
}
