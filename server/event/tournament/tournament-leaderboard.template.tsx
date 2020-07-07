import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import { ordinal } from "server/core/formats";
import forms from "server/core/forms";
import links from "server/core/links";
import * as scoreMacros from "server/entry/highscore/entry-highscore.macros";
import * as eventMacros from "server/event/event.macros";
import { ifFalse, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as userMacros from "server/user/user.macros";

export default function render(context: CommonLocals) {
  const { event, tournamentScores, entries, user, categoryTitles } = context;
  const hasEventBanner = event.related("details").get("banner") && event.get("status_tournament") === "results";

  return base(context,
    <div>
      {ifTrue(hasEventBanner, () =>
        eventMacros.eventBanner(event)
      )}

      <div class="container {'event-banner-offset' if hasEventBanner}">
        <div class="row">
          <div class="col-12">
            {ifTrue(event.get("status_tournament") === "results", () =>
              podium(event, tournamentScores)
            )}

            {ifTrue(event.get("status_tournament") === "closed", () =>
              <div>
                {podium(event, categoryTitles)}
                <p class="card card-body">Moderators are currently making a final review of the high scores
                  before revealing the tournament winners. The results will be out soon!</p>
              </div>
            )}

            {ifTrue(["closed", "results"].includes(event.get("status_tournament")), () =>
              <p class="featured"><b>Note:</b> This tournament is closed.
                New high scores will no longer impact the tournament points and rankings.</p>
            )}
          </div>
        </div>
      </div>

      {ifTrue(event.get("status_tournament") !== "closed", () =>
        <div class="container-fluid">
          <div class="row">
            <div class="col-12">
              {ifFalse(["closed", "results"].includes(event.get("status_tournament")), () =>
                <h1>Tournament leaderboard</h1>
              )}

              {ifTrue(event.related("details").get("flags").streamerOnlyTournament, () =>
                <div class="featured">
                  <h3><span class="fa fa-tv"></span> Streamer-only tournament</h3>
                  Only users who are registered <a href={links.routeUrl(event, "event", "streamers")}>as streamers</a>
                    are eligible to tournament points!
                </div>
              )}

              {ifTrue(event.get("status_tournament") !== "closed", () =>
                <div>
                  {ifTrue(event.get("status_tournament") !== "results" || tournamentScores.length > 3, () =>
                    <table class="table">
                      <thead>
                        <th>{event.get("status_tournament") !== "results" ? "Live " : ""}Ranking</th>
                        <th>User</th>
                        {entries.map(entry =>
                          <th class="text-center visible-md visible-lg" style="width: 80px">
                            <a href={links.routeUrl(entry, "entry")}>
                              <img src={entry.pictureIcon() || ""} style="max-height:60px" title={entry.get("title")} />
                            </a>
                          </th>
                        )}
                        <th>Points</th>
                      </thead>
                      <tbody>
                        {tournamentScores.map(tournamentScore => {
                          const entryScores = tournamentScore.get("entry_scores");
                          return <tr class={user && tournamentScore.related("user").get("id") === user.get("id") ? "active" : ""}>
                            <td><h3>{ordinal(tournamentScore.get("ranking"))}</h3></td>
                            <td>
                              <div class="row" dangerouslySetInnerHTML={userMacros.userThumb(tournamentScore.related("user"))}></div>
                            </td>
                            {entries.map(entry =>
                              <td class="text-center visible-md visible-lg">
                                {ifTrue(entryScores[entry.get("id")], () => {
                                  const ranking = entryScores[entry.get("id")].ranking;
                                  return <a href={links.routeUrl(entry, "entry", "scores") + "#score-rank-" + ranking} class="tournament-ranking">
                                    {scoreMacros.printRanking(ranking)}
                                  </a>;
                                })}
                              </td>
                            )}
                            <td><h3>{forms.parseInt(tournamentScore.get("score"))}</h3></td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  )}

                  {ifTrue(tournamentScores.length === 0, () =>
                    <p class="card card-body mb-5">Be the first to enter the leaderboards, by submitting a high score to any of the games!</p>
                  )}
                </div>
              )}

              {scoreMacros.pointsDistributionLegend(constants.TOURNAMENT_POINTS_DISTRIBUTION)}
            </div>
          </div>
        </div>
      )}
    </div>);
}


function podium(event, tournamentScores = []) {
  const podiumSteps = [];
  if (tournamentScores.length > 0) {
    let ranking = 1;
    podiumSteps.push(podiumPosition(1, ranking,
      tournamentScores.length > 0 ? tournamentScores[0] : undefined));
    if (tournamentScores.length > 1 && tournamentScores[1].get("score") < tournamentScores[0].get("score")) {
      ranking++;
    }
    podiumSteps.push(podiumPosition(2, ranking, tournamentScores[1]));
    if (tournamentScores.length > 2 && tournamentScores[2].get("score") < tournamentScores[1].get("score")) {
      ranking++;
    }
    podiumSteps.push(podiumPosition(3, ranking, tournamentScores[2]));
  } else {
    podiumSteps.push(<h2 class="text-center">Pending results</h2>);
  }

  return <div class="results-podium">
    <h1 class="results-podium__event-name">{event.get("title")} results</h1>
    <h2 class="results-podium__title">Tournament leaderboard</h2>

    <div class="row">
      <div class="col-md-10 offset-md-1 col-12 ">
        <div class="row results-podium-row">
          {podiumSteps}
        </div>
      </div>
    </div>
  </div>;
}

function podiumPosition(position, ranking, tournamentScore?) {
  return <div class={`col-md-4 results-podium__tournament position-${position} ranking-${ranking} ${tournamentScore ? "results-podium__step" : ""}`}>
    {ifSet(tournamentScore, () =>
      <div class="row">
        <div dangerouslySetInnerHTML={userMacros.userThumb(tournamentScore.related("user"), { fullWidth: true, centered: true })}></div>
        <div class="col-12">
          <h2 class="text-center tournament-score">{forms.parseInt(tournamentScore.get("score"))} pts.</h2>
        </div>
      </div>
    )}
  </div>;
}
