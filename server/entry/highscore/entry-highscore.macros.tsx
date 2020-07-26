import * as React from "preact";
import { ordinal } from "server/core/formats";
import links from "server/core/links";
import security from "server/core/security";
import { date, duration, relativeTime } from "server/core/templating-filters";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import * as userMacros from "server/user/user.macros";

export function highScoresLinks(entry, user, path, options: { hideSubmitButton?: boolean } = {}) {
  return <jsx-wrapper>
    {ifFalse(!options.hideSubmitButton, () =>
      <a href={links.routeUrl(entry, "entry", "submit-score") + "?redirectTo=" + encodeURIComponent(path)} class="btn btn-primary">Submit score</a>
    )}
    {ifTrue(security.canUserWrite(user, entry, { allowMods: true }), () =>
      <a href={links.routeUrl(entry, "entry", "edit-scores")} class="btn btn-outline-primary">
        <span class="fas fa-cog"></span>
      </a>
    )}
  </jsx-wrapper>;
}

export function tournamentEventBanner(tournamentEvent) {
  if (tournamentEvent) {
    return <a href={links.routeUrl(tournamentEvent, "event")} class="highscore-banner">
      <div>This game is currently featured in the</div>
      <div class="highscore-banner__title">{tournamentEvent.get("title")}</div>
    </a>;
  }
}

export function highScores(entry, scoreCollection, userScore = null, featuredEvent,
                           options: { showDates?: boolean; showActiveToggles?: boolean; streamerBadges?: any; hideViewAllScores?: boolean } = {}) {
  const highScoreType = entry.related("details").get("high_score_type");
  const colspan = 4 + (options.showDates ? 1 : 0) + (options.showActiveToggles ? 1 : 0);
  return <table class="table">
    <thead>
      <tr>
        <th>#</th>
        <th>User</th>
        <th>{highScoreType === "time" ? "Time" : "Score"}</th>
        {ifTrue(options.showDates, () =>
          <th>Date</th>
        )}
        <th>{/* Proof link */}</th>
        {ifTrue(options.showActiveToggles, () =>
          <th class="text-right">State</th>
        )}
      </tr>
    </thead>
    <tbody>
      {ifTrue(scoreCollection.length > 0, () =>
        scoreCollection.models.map(score => {
          const isOwnScore = userScore && score.get("id") === userScore.get("id");
          return <tr class={isOwnScore ? "active" : ""}>
            <td><a name={"score-rank-" + score.get("ranking")}></a>{printRanking(score.get("ranking"))}</td>
            <td>{userMacros.userLink(score.related("user"))}{streamerBadge(score.related("user"), options.streamerBadges, featuredEvent)}</td>
            <td><b>{printScore(entry, score, { showEditLink: isOwnScore })}</b></td>
            {ifTrue(options.showDates, () =>
              <td style="font-size: 0.8rem"> {date(score.get("submitted_at"))}</td>
            )}
            <td>{printProof(score)}</td>
            {ifTrue(options.showActiveToggles, () =>
              <td class="text-right">
                {ifTrue(score.get("active"), () =>
                  <jsx-wrapper>
                    <span class="badge badge-success">Active</span>&nbsp;
                    <input type="submit" name={"suspend-" + score.get("id")} class="btn btn-outline-primary btn-sm"
                      onclick={`return confirm("Suspend the score of ${score.related("user").get("title")}?")`} value="Suspend" />
                  </jsx-wrapper>
                )}
                {ifFalse(score.get("active"), () =>
                  <jsx-wrapper>
                    <span class="badge badge-warning">Suspended</span>&nbsp;
                    <input type="submit" name={"restore-" + score.get("id")} class="btn btn-outline-primary btn-sm"
                      onclick={`return confirm("Restore the score of ${score.related("user").get("title")}?")`} value="Restore" />
                  </jsx-wrapper>
                )}
              </td>
            )}
          </tr>;
        })
      )}

      {ifTrue(userScore && userScore.get("id") && userScore.get("ranking") > 10, () =>
        <jsx-wrapper>
          <tr>
            <td colspan={colspan} class="text-center">...</td>
          </tr>
        </jsx-wrapper>
      )}

      {ifTrue(scoreCollection.pagination.rowCount > 9, () =>
        <tr>
          <td colspan={colspan}>Total submitted scores: <b>{scoreCollection.pagination.rowCount}</b></td>
        </tr>
      )}
      {ifFalse(scoreCollection.pagination.rowCount > 9, () =>
        <tr>
          <td colspan={colspan}>Be the first to submit a score!</td>
        </tr>
      )}

      {ifTrue(scoreCollection.length > 0 && !options.hideViewAllScores, () =>
        <td colspan={colspan} class="text-center">
          <a href={links.routeUrl(entry, "entry", "scores")}>View all&nbsp;
            <b>{scoreCollection.pagination.rowCount || scoreCollection.length}</b> scores</a>
        </td>
      )}
    </tbody>
  </table>;
}

export function streamerBadge(scoreUser, streamerBadges, featuredEvent) {
  if (streamerBadges && streamerBadges.has(scoreUser.get("id"))) {
    if (featuredEvent) {
      return <a href={links.routeUrl(featuredEvent, "event", "streamers") + "#" + scoreUser.get(" id")}
        class="fa fa-tv" data-toggle="tooltip" title="Streamer competing in the current tournament"></a>;
    } else {
      return <span class="fa fa-tv" data-toggle="tooltip" title="Streamer"></span>;
    }
  }
}

export function printProof(score) {
  const proof = score.get("proof");
  if (proof) {
    return <a href={links.pictureUrl(proof, score)} target="alakajam_proof">
      <span class={proof.includes("youtu") || proof.includes("twitch") ? "fas fa-video" : "fas fa-camera"}></span>
    </a>;
  }
}

export function printRanking(ranking, options: { onlyMedal?: boolean } = {}) {
  if (ranking > 3) {
    return (!options.onlyMedal) ? ranking : "";
  } else {
    // Text in span needed for proper table sorting
    return <span class={"highscore-medal ranking-" + ranking}>{ranking}</span>;
  }
}

export function printScore(entry, score, options: { showEditLink?: boolean } = {}) {
  const highScoreType = entry.related("details").get("high_score_type");
  const unit = !["number", "time"].includes(highScoreType) ? highScoreType : "";
  return <jsx-wrapper>
    {(highScoreType === "time") ? (duration(score.get("score"))) : parseFloat(score.get("score"))}
    {unit}
    {ifTrue(options.showEditLink, () =>
      <a href={links.routeUrl(entry, "entry", "submit-score")}>
        <span class="fas fa-edit"></span>
      </a>
    )}
  </jsx-wrapper>;
}

export function pointsDistributionLegend(pointsDistribution) {
  return <jsx-wrapper>
    <div class="horizontal-bar"></div>

    <h2>Points distribution</h2>

    <p>Leaderboards points are awarded to all players that enter the top {pointsDistribution.length} of a game.&nbsp;
      For each spot in the high scores, each player gets a number of points as per the table below.&nbsp;
      At the end of the event, the player with the most points wins the tournament!</p>

    <div class="row">
      <div class="col-md-6">
        <table class="table">
          <thead>
            <tr>
              {pointsDistribution.map((points, index) =>
                <th>{ordinal(index - 1)}</th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              {pointsDistribution.map(points =>
                <td>{points}</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </jsx-wrapper>;
}

export function highScoreThumb(entryScore, user) {
  const entry = entryScore.related("entry");
  return <div class="featured">
    <div style="width: 100%; margin: 0 0 -10px -10px">
      {userMacros.userThumb(entryScore.related("user"), { fullWidth: true })}
    </div>
    <div class="spacing">
      Claimed
      <b>{printRanking(entryScore.get("ranking"), { onlyMedal: true })}
        {ordinal(entryScore.get("ranking"))} place</b> on
      <a href={links.routeUrl(entry, "entry")}>{entry.get("title")}</a>
      with
      <b><a href={links.routeUrl(entry, "entry", "scores")}>
        {printScore(entry, entryScore, { showEditLink: user && entryScore.get("user_id") === user.get("id") })}</a></b>
      <br />
      <span style="font-size: 0.8rem">{relativeTime(entryScore.get("submitted_at"))}</span>
    </div>
  </div>;
}