import * as React from "preact";
import base from "server/base.template";
import * as eventMacros from "server/event/event.macros";
import { ifTrue } from "server/macros/jsx-utils";
import { EventsContext } from "./events.controller";
import links from "server/core/links";

export default function render(context: EventsContext) {
  const { open, pending, closedAlakajam, closedOther, featuredEntries } = context;

  return base(context,
    <div class="container" style="width: 900px">

      <h1>Events <span class="count">({open.length + pending.length + closedAlakajam.length + closedOther.length})</span></h1>
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

      <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item">
          <a class="nav-link active" href="#alakajam_events" data-toggle="tab">
            <h2 style="margin: 0"><img src="{{ staticUrl('/static/images/favicon32.png') }}" class="no-border" />&nbsp;Past Alakajam! events</h2>
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#other_events" data-toggle="tab">
            <h2 style="margin: 0"><img src="{{ staticUrl('/static/images/favicon32.png') }}" class="no-border" />&nbsp;Other events</h2>
          </a>
        </li>
      </ul>

      <div class="tab-content">
        <div id="alakajam_events" class="events-block events-block__closed tab-pane fade show active">
          {closedAlakajam.map(event =>
            eventTable(event, featuredEntries[event.get("id")]))}
        </div>

        <div id="other_events" class="events-block events-block__closed tab-pane fade">
          {closedOther.map(event =>
            eventTable(event, featuredEntries[event.get("id")], { noResults: true }))}
        </div>
      </div>
    </div>);
}

function eventTable(event, featuredEntries, options: { noResults?: boolean } = {}) {
  return <div class={"event-table " + event.get("status") + " mr-2"}>
    <div class="event-table__header">
      <a href={ links.routeUrl(event, "event") } class="event-table__title">
        {event.get("title")}
        &nbsp;
        {ifTrue(event.get("status") === "closed", () =>
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

    {ifTrue(!options.noResults && featuredEntries && (featuredEntries.solo || featuredEntries.ranked), () =>
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
            {featuredEntries.team.map((entry, index) =>
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
