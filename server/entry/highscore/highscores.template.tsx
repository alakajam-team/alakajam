import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as scoreMacros from "server/entry/highscore/highscore.macros";
import * as formMacros from "server/macros/form.macros";

export default function render(context: CommonLocals) {
  const { path, entry, user, tournamentEvent, highScoresCollection, entryScore, streamerBadges } = context;

  formMacros.registerEditorScripts(context);

  return base(context,
    <div class="container">
      <div class="row">
        <div class="col-12">
          <h1><a href={links.routeUrl(entry, "entry")}>{entry.get("title")}</a></h1>

          <h2>Leaderboard {scoreMacros.highScoresLinks(entry, user, path)}</h2>

          {scoreMacros.tournamentEventBanner(tournamentEvent)}
          {scoreMacros.highScores(entry, highScoresCollection, entryScore, { hideViewAllScores: true, showDates: true, streamerBadges })}
        </div>
      </div>
    </div>
  );
}
