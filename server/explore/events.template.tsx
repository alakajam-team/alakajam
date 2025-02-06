import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import base from "server/base.template";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import { ifTrue } from "server/macros/jsx-utils";
import { EventsContext, TopEntriesByDivision } from "./events.controller";
import { exploreTabs } from "./explore-tabs.template";

export default function render(context: EventsContext): JSX.Element {
  const { open, pending, closed, featuredEntries, path } = context;

  return base(context,
    <div class="container">

      {exploreTabs(path)}

      {ifTrue(open.length > 0, () =>
        <div class="events-block events-block__live mr-2">
          <h2><span class="fas fa-play-circle"></span> On now!</h2>
          {open.map(event =>
            eventTable(event, featuredEntries[event.get("id")]))}
        </div>
      )}

      {ifTrue(pending.length > 0, () =>
        <div class="events-block events-block__pending">
          <h2><span class="fas fa-calendar"></span> Upcoming</h2>
          {pending.map(event =>
            eventTable(event, featuredEntries[event.get("id")]))}
        </div>
      )}

      <h2 style="margin: 0"><img src={ links.staticUrl("/static/images/favicon32.png") } class="no-border" />&nbsp;Past events</h2>

      {closed.map(event =>
        eventTable(event, featuredEntries[event.get("id")]))}
    </div>);
}

function eventTable(event: BookshelfModel, featuredEntries: TopEntriesByDivision, options: { noResults?: boolean } = {}) {
  return <div class={"event-table " + event.get("status") + " mr-2"}>
    <div class="event-table__header">
      <a href={ links.routeUrl(event, "event") } class="event-table__title">
        {event.get("title")}
        &nbsp;
        {ifTrue(event.get("status") === "closed" && event.get("entry_count"), () =>
          <span class="count">({event.get("entry_count")} entries)</span>
        )}
        <div class="event-table__dates">
          {event.get("display_dates") || "(dates unknown)"}
        </div>
      </a>
      {ifTrue(event.get("display_theme"), () =>
        <div class="event-table__theme">
          <span class="event-table__theme-label">Theme</span>
          {event.get("display_theme")}
        </div>
      )}
    </div>

    {ifTrue(Boolean(!options.noResults && featuredEntries && event.get("title").includes("Alakajam!")), () =>
      <div class="event-table__entries">
        <div class="row">
          <div class="col-sm-6">
            {(featuredEntries.solo || featuredEntries.ranked).map((entry, index) =>
              <div class="event-table__entry">
                {eventMacros.entrySmallThumb(entry)}
                <span class={"entry-results__category-medal medal" + (index + 1) + " in-small-thumb"}></span>
              </div>
            )}
          </div>
          <div class="col-sm-6">
            {featuredEntries.team?.map((entry, index) =>
              <div class="event-table__entry">
                {eventMacros.entrySmallThumb(entry)}
                <span class={"entry-results__category-medal medal" + (index + 1) + " in-small-thumb"}></span>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>;
}
