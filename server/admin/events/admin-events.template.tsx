import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { BookshelfModel } from "bookshelf";
import security from "server/core/security";
import links from "server/core/links";
import adminBase from "server/admin/admin.base";
import * as filters from "server/core/templating-filters";

export interface AdminEventsContext extends CommonLocals {
  events: BookshelfModel[];
}

export function adminEventsTemplate(context: AdminEventsContext) {
  const { user, events } = context;

  const adminButtons = (user.is_admin) ?
    <p>
      <a href={ links.routeUrl(null, "event", "create") } class="btn btn-primary">Create</a>
      <a class="btn btn-outline-primary" href="/admin/settings?edit=featured_event_name">Select featured event</a>
      <a class="btn btn-outline-primary" href="?refreshHotness=true"
        onClick={() => confirm("This is a resource intensive task. Proceed?")}>Refresh entry hotness on all events</a>
    </p>
    :
    <span></span>;

  const eventRows = [];
  for (const event of events) {
    if (security.canUserManage(user, event)) {
      eventRows.push(
        <tr>
          <td><a href={links.routeUrl(event, "event")}>{event.get("title")}</a></td>
          <td><code>{event.get("name")}</code></td>
          <td>{filters.date(event.get("started_at"))}</td>
          <td>{statusBadge(event.get("status"))}</td>
          <td><a class="btn btn-primary btn-sm" href={links.routeUrl(event, "event", "edit")}>Edit</a></td>
        </tr>);
    }
  }

  return adminBase(context,
    <div>
      <h1>Events</h1>

      {adminButtons}

      <table class="table sortable" style="margin-top: 10px">
        <thead>
          <th>Title</th>
          <th>Name</th>
          <th>Start date</th>
          <th>Status</th>
          <th></th>
        </thead>
        <tbody>
          {eventRows}
        </tbody>
      </table>
    </div>);
}

function statusBadge(value: string) {
  let className = "";
  if (value === "open") {
    className = "info";
  } else if (value !== "pending") {
    className = "default";
  }
  return <span class={"badge badge-" + className}>{value}</span>;
}
