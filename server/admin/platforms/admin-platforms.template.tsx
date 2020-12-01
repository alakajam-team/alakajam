import * as React from "preact";
import { Platform } from "server/entity/platform.entity";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import adminBase from "../admin.base";
import { AdminPlatformsContext } from "./admin-platforms.controller";

export default function render(context: AdminPlatformsContext) {
  const { editPlatform, platforms, entryCount, csrfToken } = context;

  return adminBase(context, <div>
    <h1>Platforms</h1>

    {editPlatform
      ? editForm(editPlatform, entryCount[editPlatform.id], csrfToken)
      : <p><a class="btn btn-primary" href="?create=true">Create platform</a></p>}

    <table class="table sortable">
      <thead>
        <th>ID</th>
        <th>Name</th>
        <th>Entry count</th>
        <th>Actions</th>
      </thead>
      <tbody>
        {platforms.map(platform =>
          <tr>
            <td>{platform.id}</td>
            <td>{eventMacros.entryPlatformIcon(platform.name, undefined)}</td>
            <td>{entryCount[platform.id]}</td>
            <td><a class="btn btn-primary btn-sm" href={"?edit=" + platform.id}>Edit</a></td>
          </tr>
        )}
      </tbody>
    </table>
  </div>);
}

function editForm(editPlatform: Platform, platformEntryCount: number, csrfToken: Function) {
  return <form action="/admin/platforms" method="post" class="card">
    <div class="card-header">
      <div class="float-right">
        {deleteButton(editPlatform, platformEntryCount)}
      </div>
      <h2>{editPlatform.name}</h2>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label for="id">ID</label>
        <p>{editPlatform.id || "N.A."}</p>
        <input type="hidden" name="id" value={ editPlatform.id } />
      </div>
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" name="name" value={ editPlatform.name } class="form-control" autocomplete="off" autofocus />
      </div>

      <div class="form-group">
        {csrfToken()}
        <input type="submit" class="btn btn-primary mr-1" value="Save" />
        <a href="?" class="btn btn-outline-primary">Cancel</a>
      </div>
    </div>
  </form>;
}

function deleteButton(editPlatform: Platform, platformEntryCount: number) {
  if (!editPlatform.id)  {
    return;
  } else if (platformEntryCount === 0) {
    return <a class="btn btn-danger btn-sm" href={"?delete=" + editPlatform.id}
      onclick="return confirm('This cannot be reverted. Continue?')">Delete</a>;
  } else {
    return <>
      <span class="btn btn-danger btn-sm disabled">Delete</span>
      {formMacros.tooltip("Platforms used by entries cannot be deleted. Run manual DB queries to fix that before deletion.")}
    </>;
  }
}
