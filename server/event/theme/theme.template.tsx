import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { markdown } from "server/core/templating-filters";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";
import { themeIdeasForm } from "./components/theme-ideas-form.component";
import { themeIdeasView } from "./components/theme-ideas-view.component";
import { themeResults } from "./components/theme-results.component";
import { themeShortlist } from "./components/theme-shortlist.component";
import { themeStats } from "./components/theme-stats.component";
import { themeVotingSamples } from "./components/theme-voting-samples.component";
import { themeVoting } from "./components/theme-voting.component";

export default function render(context: CommonLocals): JSX.Element {
  const { event, themesPost, user, userLikes, votingAllowed, sampleThemes, userRanks, defaultShortlistSize,
    shortlist, randomizedShortlist, hasRankedShortlist, shortlistVotes, activeShortlist, eliminatedShortlist,
    ideasRequired, eliminationMinNotes,
    voteCount, votesHistory, maxThemeSuggestions, infoMessage, path } = context;
  const userThemes = context.userThemes || [];

  return base(context,
    <div>
      {ifSet(themesPost, () =>
        <div class="container thin">
          {postMacros.post(themesPost, { readingUser: user, readingUserLikes: userLikes })}
        </div>
      )};

      {ifNotSet(themesPost, () =>
        <div class="container themes">
          {ifSet(event.related("details").get("theme_page_header"), () =>
            <div class="card mb-3">
              <div class="card-body user-contents" dangerouslySetInnerHTML={markdown(event.related("details").get("theme_page_header"))} />
            </div>
          )}

          <div class="row">
            <div class="col-md-4">
              <div id="js-view-themes">
                <h2>My theme ideas</h2>
                {themeIdeasView(user, event, userThemes, maxThemeSuggestions, path)}
              </div>

              <form id="js-manage-themes" method="post" class="js-warn-on-unsaved-changes d-none">
                {context.csrfToken()}

                <h2>My theme ideas</h2>
                {themeIdeasForm(event, userThemes, maxThemeSuggestions)}
              </form>

              <div class="themes__stats">
                <h2>Stats</h2>
                {themeStats(event, user, userThemes, voteCount, shortlistVotes)}

                <div class="mt-3 d-none d-md-block">
                  <h2>How it works</h2>
                  <ul>
                    <li>The lowest ranking themes (having {eliminationMinNotes} votes or more) are eliminated regularly.</li>
                    <li>After one week, only the {defaultShortlistSize} best themes will remain.
                      The longer the theme stands before elimination, the better it is!</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="col-md-8">
              {ifTrue(infoMessage, () =>
                <div class="alert alert-info">{infoMessage}</div>
              )}

              {ifTrue(event.get("status_theme") === "voting", () =>
                <div class="themes__voting">
                  <h2>Theme voting</h2>
                  {ifSet(user, () => themeVoting(event, votingAllowed, ideasRequired, votesHistory, context.csrfToken, context.csrfTokenHTML))}
                  {ifNotSet(user, () => themeVotingSamples(sampleThemes, votingAllowed, ideasRequired, path))}
                </div>
              )}

              {ifTrue(event.get("status_theme") === "shortlist" || event.get("status_theme") === "closed",
                () => themeShortlist(event, user, randomizedShortlist, activeShortlist,
                  eliminatedShortlist, hasRankedShortlist, context.csrfToken, path))}

              {ifTrue(event.get("status_theme") === "results", () =>
                themeResults(event, shortlist, userRanks)
              )}
            </div>
          </div>
        </div>
      )}
    </div>);
}
