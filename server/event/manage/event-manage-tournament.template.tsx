import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import * as eventMacros from "server/event/event.macros";
import { ifTrue } from "server/macros/jsx-utils";
import { eventManageBase } from "./event-manage.base.template";

export default function render(context: CommonLocals) {
  const { event, tournamentEntries } = context;
  const canRefreshResult = ["playing", "closed"].includes(event.get("status_tournament"));

  return eventManageBase(context, <div>
    <h1>{event.get("title")} tournament games <span class="count">({tournamentEntries.length || "0"})</span></h1>

    <p>This page lets you manage the games for which high scores are counted in the tournament's leaderboard.</p>

    {ifTrue(canRefreshResult, () =>
      <form method="post" class="form-inline">
        <p>
          {context.csrfTokenJSX()}
          <input type="submit" name="refresh" class="btn btn-primary" value="Refresh all tournament scores"
            onclick="return confirm('Refresh all tournament scores?')" />
        </p>
      </form>
    )}
    {ifTrue(event.get("status_tournament") === "results" && !canRefreshResult, () =>
      <p class="featured"><b>Note:</b> The tournament results are out. The options for refreshing the scores/rankings have been disabled.</p>
    )}

    <div class="game-grid edit-event-tourn">
      {tournamentEntries.map(tournamentEntry => {
        const entry = tournamentEntry.related("entry");
        return <div class="game-grid-entry">
          {eventMacros.entryThumb(entry)}
          {ifTrue(entry.get("status_high_score") === "off", () =>
            <div class="entry-thumb__form"><span class="badge badge-danger">High scores are not enabled</span></div>
          )}
          <form method="post" class="form-inline form-group" style="margin-top: 5px">
            {context.csrfTokenJSX()}
            <input type="hidden" name="id" value={entry.get("id")} />
            <label for="ordering">Order&nbsp;</label>
            <input type="text" name="ordering" class="form-control mr-1" value={tournamentEntry.get("ordering")} style="max-width: 50px" />
            <button type="submit" name="update" class="btn btn-primary mr-1">
              <span class="fas fa-save"></span>
            </button>
            <button type="submit" name="remove" class="btn btn-outline-primary"
              onclick={`return confirm('Remove &quot;${escape(entry.get("title"))}&quot; from the tournament?')`}>
              <span class="fas fa-trash"></span>
            </button>
          </form>
        </div>;
      })}

      <div class="game-grid-entry">
        <h3>Add game</h3>
        <form method="post" class="form-inline">
          {context.csrfTokenJSX()}
          <input type="number" name="add" class="form-control" placeholder="Entry ID" style="max-width: 120px" />
          <input type="submit" class="btn btn-primary" value="Add" />
        </form>
      </div>
    </div>
  </div>
  );
}
