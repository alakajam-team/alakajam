import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import links from "server/core/links";
import { ifTrue } from "server/macros/jsx-utils";

export function eventDashboardThemes(event: BookshelfModel) {
  if (event.get("status_theme") !== "disabled") {
    return <>
      {ifTrue(event.get("status_theme") === "off", () =>
        <div class="card card-body">
          <h4>Theme submissions are not open yet.</h4>
        </div>
      )}
      {ifTrue(event.get("status_theme") !== "off", () =>
        <a href={links.routeUrl(event, "event", "themes")} class="btn btn-primary">Browse themes</a>
      )}
    </>;
  }
}
