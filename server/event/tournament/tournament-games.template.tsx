import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import links from "server/core/links";
import * as scoreMacros from "server/entry/highscore/highscore.macros";
import * as eventMacros from "server/event/event.macros";
import * as tournamentMacros from "server/event/tournament/tournament.macros";
import { ifTrue } from "server/macros/jsx-utils";

export default function render(context: CommonLocals): JSX.Element {
  const { path, entries, event, user, canEnterTournament, eventParticipation, tournamentScore, activeEntries,
    highScoresMap, userScoresMap, streamerBadges } = context;

  return base(context,
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <h1>Tournament games <span class="count">({entries.length})</span></h1>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          {ifTrue(["closed", "results"].includes(event.get("status_tournament")), () =>
            <p class="featured"><b>Note:</b> This tournament is closed.
              New high scores will appear here, but will no longer impact the tournament points and rankings.</p>
          )}
        </div>
      </div>
      <div class="row d-flex flex-nowrap px-3">
        <div class="d-none d-lg-block pr-4" style="max-width: 400px">
          {ifTrue(user && canEnterTournament, () =>
            <div class="action-banner">
              <div class="action-banner__title">
                Your ranking&nbsp;
                <a href={links.routeUrl(event, "event", "tournament-leaderboard")} class="btn btn-sm btn-primary">View leaderboard</a>
              </div>
              <div class="card">
                {tournamentMacros.userRanking(user, event, eventParticipation, tournamentScore)}
              </div>
            </div>
          )}
          {ifTrue(user && !canEnterTournament && event.related("details").get("flags")?.streamerOnlyTournament, () =>
            <div class="action-banner">
              <div class="px-2 action-banner__title">
                <span class="fa fa-tv"></span> Streamer-only tournament
              </div>
              <div class="px-2">
                <p>Only users who are registered <a href={links.routeUrl(event, "event", "streamers")}>as streamers</a> are
                  eligible to tournament points!</p>
                <p class="mb-0">You are welcome to play the games and compete with the streamers,
                    but you will not appear on the leaderboard unless you register as a streamer.</p>
              </div>
            </div>
          )}

          <h2>Recent scores</h2>
          {activeEntries.map(entryScore =>
            scoreMacros.highScoreThumb(entryScore, user)
          )}
        </div>
        <div class="flex-grow-1">
          <div class={`game-grid tournament ${entries.length === 6 ? "line-of-3-entries" : ""} tournament`}>
            {entries.map(entry =>
              <div class="game-grid-entry">
                {eventMacros.entryThumb(entry)}
                <div class="entry-thumb__form">
                  {scoreMacros.highScoresLinks(entry, user, path)}
                </div>
                <div style="display: flex">
                  {scoreMacros.highScores(entry, highScoresMap[entry.get("id")], userScoresMap[entry.get("id")], { streamerBadges })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          {scoreMacros.pointsDistributionLegend(constants.TOURNAMENT_POINTS_DISTRIBUTION)}
        </div>
      </div>
    </div>);
}
