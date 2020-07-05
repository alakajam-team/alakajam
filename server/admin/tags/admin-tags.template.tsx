import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as React from "preact";
import * as eventMacros from "server/event/event.macros";
import { ifSet } from "server/macros/jsx-utils";
import adminBase from "../admin.base";
import { AdminTagsContext } from "./admin-tags.controller";

export default function render(context: AdminTagsContext) {
  const { tags, detailedTag, sortBy } = context;

  return adminBase(context,
    <div>
      <h1>Tags <span class="count">({tags.length})</span></h1>

      {ifSet(detailedTag, () =>
        details(detailedTag, sortBy)
      )}

      <div class="form-group">
        <div class="btn-group">
          <a href="?sortBy=date" class="btn btn-outline-secondary" disabled={sortBy === "date"}>Sort by date</a>
          <a href="?" class="btn btn-outline-secondary" disabled={!sortBy}>Sort by usage</a>
        </div>
      </div >

      <table class="table sortable">
        <thead>
          <th>Tag</th>
          <th>Usage count</th>
          <th>Actions</th>
        </thead>
        <tbody>
          {tags.map(tag =>
            <tr>
              <td><a href={`?view=${tag.id}&amp;sortBy=${sortBy}`}>{tag.value}</a></td>
              <td>{tag.count}</td>
              <td>
                <a class="btn btn-primary btn-sm" href={`?view=${tag.id}&amp;sortBy=${sortBy}`}>Details</a>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div >);
}

function details(detailedTag: BookshelfModel, sortBy: string) {
  return <div class="card mb-3">
    <div class="card-header">
      <div class="float-right">
        <a class="btn btn-danger mr-1" href={`?delete=${detailedTag.get("id")}&amp;sortBy=${sortBy}`}
          onclick="return confirm('This cannot be reverted. The tag will be removed from all entries using it. Continue?')">
          Delete this tag
        </a>
        <a class="btn btn-outline-secondary" href="?">
          <span class="fas fa-trash"></span>
        </a>
      </div>
      <h2 class="mb-0">{detailedTag.get("value")}</h2>
    </div>
    <div class="card-body">
      <div class="container">
        <h3>Tag usage</h3>
        <div class="row">
          {detailedTag.related<BookshelfCollection>("entries").models.map(entry =>
            <div class="col-4" style="margin-bottom: 5px">
              {eventMacros.entrySmallThumb(entry)}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>;
}
