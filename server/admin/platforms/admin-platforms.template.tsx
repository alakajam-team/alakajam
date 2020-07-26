import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import adminBase from "../admin.base";
import { AdminPlatformsContext } from "./admin-platforms.controller";

export default function render(context: AdminPlatformsContext) {
  const { editPlatform, platforms, entryCount, csrfToken } = context;

  return adminBase(context, <div>
    <h1>Platforms</h1>

    {editPlatform
      ? editForm(editPlatform, entryCount[editPlatform.get("id")], csrfToken)
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
            <td>{platform.get("id")}</td>
            <td>{eventMacros.entryPlatformIcon(platform.get("name"), undefined)}</td>
            <td>{entryCount[platform.get("id")]}</td>
            <td><a class="btn btn-primary btn-sm" href={"?edit=" + platform.get("id")}>Edit</a></td>
          </tr>
        )}
      </tbody>
    </table>
  </div>);
}

function editForm(editPlatform: BookshelfModel, platformEntryCount: number, csrfToken: Function) {
  return <form action="/admin/platforms" method="post" class="card">
    <div class="card-header">
      <div class="float-right">
        {deleteButton(editPlatform, platformEntryCount)}
      </div>
      <h2>{editPlatform.get("name")}</h2>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label for="id">ID</label>
        <p>{editPlatform.get("id") || "N.A."}</p>
        <input type="hidden" name="id" value={ editPlatform.get("id") } />
      </div>
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" name="name" value={ editPlatform.get("name") } class="form-control" autocomplete="off" />
      </div>

      <div class="form-group">
        {csrfToken()}
        <input type="submit" class="btn btn-primary mr-1" value="Save" />
        <a href="?" class="btn btn-outline-primary">Cancel</a>
      </div>
    </div>
  </form>;
}

function deleteButton(editPlatform: BookshelfModel, platformEntryCount: number) {
  if (!editPlatform.get("id"))  {
    return;
  } else if (platformEntryCount === 0) {
    return <a class="btn btn-danger btn-sm" href={"?delete=" + editPlatform.get("id")}
      onclick="return confirm('This cannot be reverted. Continue?')">Delete</a>;
  } else {
    return <jsx-wrapper>
      <span class="btn btn-danger btn-sm disabled">Delete</span>
      {formMacros.tooltip("Platforms used by entries cannot be deleted. Run manual DB queries to fix that before deletion.")}
    </jsx-wrapper>;
  }
}
