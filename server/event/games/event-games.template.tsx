import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import * as gamesSearchMacros from "server/macros/games-search.macros";
import { ifFalse, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { path, user, event, userEntry, entriesCollection, searchOptions, voteHistory, rescueEntries, requiredVotes } = context;

  return base(context,
    <div class="container-fluid">
      <div class="row">

        <div class="col-xl-3 col-lg-4 col-md-5">
          {ifSet(user, () =>
            eventMacros.eventShortcutMyEntry(event, userEntry)
          )}

          {gamesSearchMacros.searchForm(context, { fixedEvent: true })}

          {ifTrue(user && ["voting", "voting_rescue", "results"].includes(event.get("status_results")), () =>
            <div class="list-group my-3">
              <div class="list-group-item">
                <h4>Your ratings</h4>
              </div>
              <div class="list-group-item">
                <p><a href={links.routeUrl(event, "event", "ratings")} class="btn btn-primary">Manage ratings</a></p>
                <div class="d-none d-md-block">
                  {voteHistory.map(vote =>
                    <p>
                      {eventMacros.entrySmallThumb(vote.related("entry"))}
                    </p>
                  )}
                  {ifTrue(voteHistory.length === 0, () =>
                    "You didn't rate entries yet."
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div class="col-xl-9 col-lg-8 col-md-7">
          <h1>
            Games{" "}
            <span class="count">({entriesCollection.pagination.rowCount})</span>
            { gamesSearchMacros.searchDescription(searchOptions) }
          </h1>

          {ifTrue(rescueEntries.length > 0, () => {
            const entryThumbOptions = { showKarma: true };
            return <div class="entries-rescue">
              <h3>Rescue these games by rating them!</h3>
              <div class="game-grid">
                {rescueEntries.map(entry =>
                  <div class="game-grid-entry">
                    {eventMacros.entryThumb(entry, entryThumbOptions)}
                    <div class="entry-thumb__score">
                      <span class="float-right">{requiredVotes - entry.related("details").get("rating_count")}</span>
              Missing ratings
                    </div>
                  </div>
                )}
              </div>
            </div>;
          })}

          <div class="horizontal-bar">
            Items&nbsp;
            {ifTrue(entriesCollection.pagination.rowCount > entriesCollection.length, () => {
              const firstItemIndex = 1 + (entriesCollection.pagination.page - 1) * entriesCollection.pagination.pageSize;
              return `${firstItemIndex} - ${firstItemIndex + entriesCollection.length - 1} `;
            })}
            sorted by&nbsp;
            {ifTrue(searchOptions.sortBy === "karma", () =>
              <span>
                Karma {formMacros.tooltip("Rate and review other games to increase your karma and get featured higher on the list!")}
              </span>
            )}
            {ifFalse(searchOptions.sortBy === "karma", () =>
              <span>
                game hotness {formMacros.tooltip("Hotness mixes the rankings from all categories into a single score.")}
              </span>
            )}
          </div>

          {navigationMacros.pagination(entriesCollection.pagination.page, entriesCollection.pagination.pageCount, path)}

          <div class="game-grid">
            {entriesCollection.models.map(entry =>
              <div class="game-grid-entry">
                {eventMacros.entryThumb(entry, { showKarma: true })}
              </div>
            )}
            {ifTrue(entriesCollection.length === 0, () =>
              <div class="card card-body">No entries found.</div>
            )}
          </div>

          {navigationMacros.pagination(entriesCollection.pagination.page, entriesCollection.pagination.pageCount, path)}
        </div>
      </div>
    </div>
  );
}
