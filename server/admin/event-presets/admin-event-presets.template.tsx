import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import * as eventManageMacros from "server/event/manage/event-manage.macros";
import { EventCountdownOffset } from "server/event/manage/event-manage.macros";
import { ifSet } from "server/macros/jsx-utils";
import adminBase from "../admin.base";
import { AdminEventPresetsContext } from "./admin-event-presets.controller";
import { User } from "server/entity/user.entity";

export default function render(context: AdminEventPresetsContext) {
  return adminBase(context,
    <div>
      <h1>Event presets</h1>
      {context.editEventPreset ? edit(context.editEventPreset, context.countdownOffset, context.user, context.csrfToken) : actions()}
      {list(context.eventPresets)}
    </div>
  );
}

function actions() {
  return <div>
    <p>
      Event presets are just a way to simplify event administration:
      they allow to change plenty of event settings (states, call to action) in a single step.
    </p>
    <p>
      <a href="?create" class="btn btn-primary">Create preset</a>
    </p>
  </div>;
}

function edit(eventPreset: BookshelfModel, countdownOffset: EventCountdownOffset, user: User, csrfToken: Function) {
  return <div class="card card-body">
    <h2><span id="preset-header"></span></h2>
    <form method="post" action="?">
      {csrfToken()}
      <div class="form-group">
        <label for="title">Preset title</label>
        <input type="text" class="form-control js-sync-text" name="title" value={ eventPreset.get("title") }
          data-sync-text-display-selector="#preset-header" data-sync-text-default="New" />
      </div>

      {eventManageMacros.countdownForm(eventPreset, user, { countdownOffset })}

      <div class="alert alert-info">
        <b>Offset from start</b>: Instead of an actual date for the deadline, set an offset in days, hours and minutes from the event start.
        This delay will be added to the start date of the actual event. Negative numbers are supported.
      </div>

      {eventManageMacros.stateForm(eventPreset)}

      <div class="form-group">
        <button name="save" type="submit" class="btn btn-primary mr-1">Save</button>
        <a href="?" class="btn btn-outline-primary">Cancel</a>
        {ifSet(eventPreset.get("id"), () =>
          <div class="float-right">
            <input type="hidden" name="id" value={eventPreset.get("id")} />
            <button type="submit" class="btn btn-danger" name="delete" onclick="return confirm('Delete this preset?')">Delete</button>
          </div>)}
      </div>
    </form>
  </div>;
}

function list(eventPresets: BookshelfModel[]) {
  return <table class="table">
    <thead>
      <tr>
        <th>Title</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {eventPresets.map((eventPreset) =>
        <tr>
          <td>{eventPreset.get("title")}</td>
          <td>
            <a href={ "?edit=" + eventPreset.get("id") } class="btn btn-primary mr-1">Edit</a>
            <a href={ "?create&reference=" + eventPreset.get("id") } class="btn btn-outline-primary">Copy</a>
          </td>
        </tr>
      )}
    </tbody>
  </table>;
}
