import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import * as gamesSearchMacros from "server/macros/games-search.macros";
import { ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { user, searchedEvent, featuredEvent, searchOptions, entriesCollection, rescueEntries, requiredVotes, path } = context;

  return base(context,
    <div class="container-fluid">
      <div class="row">
        <div class="col-sm-4 col-md-3">
          {gamesSearchMacros.searchForm(context)}

          <div class="d-none d-sm-block mt-3">
            <h3>Adding games</h3>
            <p>Users can submit game made during any jam, even external ones. You can add your own
              <a href={links.routeUrl(user, "user", "entries")}>from your Dashboard</a>.
            </p>
          </div>
        </div>
        <div class="col-sm-8 col-md-9">
          <h1>
            {ifTrue(searchedEvent, () =>
              <>
                <a href={searchedEvent.get("status_entry") !== "off" ? links.routeUrl(featuredEvent, "event", "games") : "posts"}>
                  {searchedEvent.get("title")}
                </a>
                {" "}
              </>
            )}
            Games
            {searchOptions.eventId === null ? " from external events " : " "}
            <span class="count">({entriesCollection.pagination.rowCount})</span>
            {gamesSearchMacros.searchDescription(searchOptions, searchedEvent)}
          </h1>

          {ifTrue(featuredEvent && searchedEvent && featuredEvent.get("id") === searchedEvent.get("id"), () =>
            ratingsPhaseBlock(featuredEvent, rescueEntries, requiredVotes)
          )}

          {navigationMacros.pagination(entriesCollection.pagination.page, entriesCollection.pagination.pageCount, path)}

          <div class="game-grid">
            {entriesCollection.models.map(entry =>
              <div class="game-grid-entry">
                {eventMacros.entryThumb(entry, { showEvent: true })}
              </div>
            )}
          </div>

          {navigationMacros.pagination(entriesCollection.pagination.page, entriesCollection.pagination.pageCount, path)}
        </div>
      </div>
    </div>
  );
}

function ratingsPhaseBlock(featuredEvent, rescueEntries, requiredVotes) {
  return <div>

    {ifTrue(["voting", "voting_rescue"].includes(featuredEvent.get("status_results")), () =>
      <div class="card card-body p-2 mb-3">
        <b><img src={links.staticUrl("/static/images/favicon16.png")} /> Rating phase in progress</b><br />
        All jam entrants are invited to rate other people's games. Everyone else can still play and post comments.
      </div>
    )}

    {ifTrue(rescueEntries.length > 0, () =>
      <div class="entries-rescue">
        <h3>Rescue these games by rating them!</h3>
        <div class="game-grid">
          {rescueEntries.map(entry =>
            <div class="game-grid-entry">
              {eventMacros.entryThumb(entry)}
              <div class="entry-thumb__score">
                <span class="float-right">{requiredVotes - entry.related("details").get("rating_count")}</span>
                Missing votes
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>;
}
