import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as scoreMacros from "server/entry/highscore/highscore.macros";
import * as formMacros from "server/macros/form.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { entry, highScoresCollection, featuredEvent } = context;

  formMacros.registerEditorScripts(context);

  return base(context,
    <div class="container">
      <div class="row">
        <div class="col-12">
          <h1><a href={links.routeUrl(entry, "entry")}>{ entry.get("title")}</a></h1>

          <h2>Manage scores</h2>

          <p>You can suspend here any score that seems invalid. Any suspended score will not be deleted,
            it will simply no longer appear in the public high scores.</p>

          <form method="post">
            {context.csrfToken()}
            {scoreMacros.highScores(entry, highScoresCollection, undefined, featuredEvent, { showActiveToggles: true, showDates: true })}
            <input type="submit" name="clearall" class="btn btn-danger" onclick="return confirm('
              This will actually delete all the scores. It\'s here in case you make gameplay changes that turn all scores obsolete.
              Do you really want to reset all scores?')" value="Reset all scores" />
          </form>
        </div>
      </div>
    </div>
  );
}
