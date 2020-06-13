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
  const { editEventTemplate, eventTemplates, eventPresets, csrfTokenJSX } = context;

  formMacros.registerCodeMirrorScripts(context);

  return adminBase(context,
    <div>
      <h1>Event templates</h1>

      <Actions eventTemplate={editEventTemplate} />
      <EditForm eventTemplate={editEventTemplate} eventPresets={eventPresets} csrfTokenJSX={csrfTokenJSX} />
      <Table eventTemplates={eventTemplates} />
    </div>);
}

function Actions(props: { eventTemplate: BookshelfModel }) {
  if (!props.eventTemplate) {
    return <div>
      <p>These templates allow to create an event with more sensible defaults.</p>
      <p>
        <a href="?create" class="btn btn-primary">Create template</a>
      </p>
    </div>;
  }
}

function EditForm(props: { eventTemplate: BookshelfModel; eventPresets: BookshelfModel[]; csrfTokenJSX: () => JSX.Element }) {
  if (props.eventTemplate) {
    return <div class="card card-body">
      <h2><span id="template-header"></span> event template</h2>
      <form method="post" action="?">
        {props.csrfTokenJSX()}
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" required class="form-control js-sync-text" name="title" value={props.eventTemplate.get("title")}
            data-sync-text-display-selector="#template-header" data-sync-text-default="New" />
        </div>
        <div class="form-group">
          <label for="title">Default event title</label>
          <input type="text" class="form-control" name="event-title" value={props.eventTemplate.get("event_title")} />
        </div>
        <div class="form-group">
          <label for="logo">Preset</label>
          <EventPresetsSelect eventTemplate={props.eventTemplate} eventPresets={props.eventPresets}></EventPresetsSelect>
        </div>
        {eventManageMacros.linksForm(props.eventTemplate)}
        {eventManageMacros.jamConfigForm(props.eventTemplate, props.eventTemplate)}
        <div class="form-group">
          <DeleteButton eventTemplate={props.eventTemplate}></DeleteButton>
          <button name="save" type="submit" class="btn btn-primary mr-1">Save</button>
          <a href="?" class="btn btn-outline-primary">Cancel</a>
        </div>
      </form>
    </div>;
  }
}

function DeleteButton(props: { eventTemplate: BookshelfModel }) {
  if (props.eventTemplate.get("id")) {
    return <div class="float-right">
      <input type="hidden" name="id" value={props.eventTemplate.get("id")} />
      <button type="submit" class="btn btn-danger" name="delete" onClick={() => confirm("Delete this template?")}>Delete</button>
    </div>;
  }
}

function EventPresetsSelect(props: { eventTemplate: BookshelfModel; eventPresets: BookshelfModel[] }) {
  const eventPresetOptions = [];
  props.eventPresets.forEach((eventPreset) => {
    eventPresetOptions.push(
      <option value={eventPreset.get("id")}
        selected={props.eventTemplate.get("event_preset_id") === eventPreset.get("id")}>
        {eventPreset.get("title")}
      </option>);
  });
  return <select name="event-preset-id" class="js-select" style="width: 100%" data-placeholder="None" data-allow-clear="true">
    <option value=""></option>
    {eventPresetOptions}
  </select>;
}

function Table(props: { eventTemplates: BookshelfModel[] }) {
  const rows = [];
  for (const eventTemplate of props.eventTemplates) {
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
