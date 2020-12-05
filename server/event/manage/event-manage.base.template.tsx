import React, { JSX } from "preact";
import { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { ifTrue } from "server/macros/jsx-utils";

export function eventManageBase(context: CommonLocals, editEventBody: JSX.Element) {
  const { event, path, infoMessage, errorMessage } = context;

  const createdEvent = event && event.get("id");

  return base(context,

    <div class="container">
      <div class="row">
        <div class="col-sm-4 col-md-3">
          <div class="list-group mb-3">
            <div class="list-group-item">
              <h4 style="margin: 0">{createdEvent ? event.get("title") : "Event"}</h4>
            </div>
            {editEventLink(event, createdEvent, "edit", "General", path)}
            {editEventLink(event, createdEvent, "edit-themes", "Themes", path)}
            {editEventLink(event, createdEvent, "edit-entries", "Entries", path)}
            {editEventLink(event, createdEvent, "edit-rankings", "Rankings", path)}
            {editEventLink(event, createdEvent, "edit-tournament-games", "Tournament", path,
              { disabled: createdEvent ? event.get("status_tournament") === "disabled" : false })}
          </div>
        </div>
        <div class="col-sm-8 col-md-9">
          {ifTrue(infoMessage, () =>
            <div class="alert alert-info">{infoMessage}</div>
          )}
          {ifTrue(errorMessage, () =>
            <div class="alert alert-warning">{errorMessage}</div>
          )}

          {editEventBody}
        </div>
      </div>
    </div>
  );
}

function editEventLink(event, createdEvent, page, label, path, options: { disabled?: boolean } = {}) {
  const url = links.routeUrl(event, "event", page);
  return <a href={url} class={"list-group-item " +
    (path === url && createdEvent ? "active list-group-item-primary " : "") +
    ((!createdEvent || options.disabled) ? "disabled" : "")}>{label}</a>;
}
