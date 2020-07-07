import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { date, relativeTime } from "server/core/templating-filters";
import * as scoreMacros from "server/entry/highscore/entry-highscore.macros";
import * as entryMacros from "server/event/event.macros";
import { ifTrue } from "server/macros/jsx-utils";
import dashboardBase from "./dashboard.base.template";

export default function render(context: CommonLocals) {
  const { activeEntries, medals, sortBy, userScores, entriesLastActivity } = context;

  const totalMedals = (medals[1] || 0) + (medals[2] || 0) + (medals[3] || 0);

  return dashboardBase(context,
    <div>
      <h1>Scores</h1>

      <div class="row">
        <div class="col-md-8">
          <h2>Personal scores</h2>

          <div style="line-height: 40px">
            <div class="row">
              <div class="col-sm-4">
                {ifTrue(totalMedals > 0, () =>
                  <div>
                    {scoreMacros.printRanking(1)} x{medals[1] || 0}
                    {scoreMacros.printRanking(2)} x{medals[2] || 0}
                    {scoreMacros.printRanking(3)} x{medals[3] || 0}
                  </div>
                )}
              </div>
              <div class="col-sm-8 text-right">
                Sort scores by
                {linkSortBy("submitted_at", "Latest", sortBy)}
                {linkSortBy("ranking", "Ranking", sortBy)}
                {linkSortBy("activity", "Game activity", sortBy)}
              </div>
            </div>
          </div>

          <table class="table sortable">
            <thead>
              <tr>
                <th>#</th>
                <th>Game</th>
                <th>Score</th>
                <th>Date</th>
                <th></th>
                <th>Last game activity</th>
              </tr>
            </thead>
            <tbody>
              {userScores.forEach(userScore => {
                const entry = userScore.related("entry");
                return <tr>
                  <td>{scoreMacros.printRanking(userScore.get("ranking"))}</td>
                  <td style="max-width: 200px">{entryMacros.entrySmallThumb(entry)}</td>
                  <td>
                    <b>{scoreMacros.printScore(entry, userScore, { showEditLink: true })}</b>
                  </td>
                  <td style="font-size: 0.8rem">{date(userScore.get("updated_at"))}</td>
                  <td>
                    <b>{scoreMacros.printProof(userScore)}</b>
                  </td>
                  <td style="font-size: 0.8rem">
                    <a href={links.routeUrl(entry, "entry", "scores")}>{relativeTime(entriesLastActivity[userScore.get("entry_id")])}</a>
                  </td>
                </tr>;
              })}

              {ifTrue(userScores.length === 0, () =>
                <tr>
                  <td colspan="6" class="text-center">No score submitted yet!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div class="col-md-4">
          <h2>Recent scores</h2>
          {activeEntries.map(entryScore =>
            scoreMacros.highScoreThumb(entryScore)
          )}
        </div>
      </div>
    </div>);
}

function linkSortBy(id, label, sortedBy) {
  return <a href="?sortBy={id }}" class={"btn btn-sm btn-outline-secondary ml-1 " + (sortedBy === id ? "disabled" : "")}>{label}</a>;
}
