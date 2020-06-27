import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import adminBase from "server/admin/admin.base";
import links from "server/core/links";
import security from "server/core/security";
import * as filters from "server/core/templating-filters";
import { User } from "server/entity/user.entity";
import { AdminEventsContext } from "./admin-events.controller";

export default function render(context: AdminEventsContext) {
  const { user, events } = context;

  return adminBase(context,
    <div>
      <h1>Events</h1>

      {adminButtons(user)}

      <table class="table sortable mt-3">
        <thead>
          <th>Title</th>
          <th>Name</th>
          <th>Start date</th>
          <th>Status</th>
          <th></th>
        </thead>
        <tbody>
          {eventRows(events, user)}
        </tbody>
      </table>
    </div>);
}

function adminButtons(user: User) {
  if (user.is_admin) {
    return <p>
      <a href={ links.routeUrl(null, "event", "create") } class="btn btn-primary mr-1">Create</a>
      <a class="btn btn-outline-primary mr-1" href="/admin/settings?edit=featured_event_name">Select featured event</a>
      <a class="btn btn-outline-primary" href="?refreshHotness=true"
        onclick="return confirm('This is a resource intensive task. Proceed?')">Refresh entry hotness on all events</a>
    </p>;
  }
}

function eventRows(events: BookshelfModel[], user: User) {
  const rows = [];
  for (const event of events) {
    if (security.canUserManage(user, event)) {
      rows.push(
        <tr>
          <td><a href={links.routeUrl(event, "event")}>{event.get("title")}</a></td>
          <td><code>{event.get("name")}</code></td>
          <td>{filters.date(event.get("started_at"))}</td>
          <td>{statusBadge(event.get("status"))}</td>
          <td><a class="btn btn-primary btn-sm" href={links.routeUrl(event, "event", "edit")}>Edit</a></td>
        </tr>);
    }
  }
  return rows;
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
