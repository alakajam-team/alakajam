import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";

export function themeVoting(event: BookshelfModel, votingAllowed: boolean,
  ideasRequired: number, votesHistory: BookshelfModel[], csrfToken: () => JSX.Element, csrfTokenHTML: () => string) {
  return <div>
    <div class="card theme-vote">
      {ifTrue(votingAllowed, () =>
        <div id="js-theme-vote"
          data-find-themes-url={links.routeUrl(event, "event", "ajax-find-themes")}
          data-save-vote-url={links.routeUrl(event, "event", "ajax-save-vote")}>
        </div>
      )}
      {ifFalse(votingAllowed, () =>
        `Voting will start when at least ${ideasRequired} ideas are submitted.`
      )}
    </div>
    <div class="horizontal-bar">Votes history</div>
    <div id="js-theme-history" class="row">
      {(votesHistory || []).map(vote => {
        if (vote.related("theme").get("status") !== "banned") {
          return <div class="col-sm-6">
            <div class="theme-past">
              <table>
                <tr><td class="theme-past__buttons">
                  <form method="post">
                    {csrfToken()}
                    <input type="hidden" name="action" value="vote" />
                    <input type="hidden" name="theme-id" value={vote.get("theme_id")} />
                    <button name="upvote" class={"btn btn-sm mr-1 "
                      + (vote.get("score") > 0 ? "btn-success" : "btn-outline-secondary")}>
                      <span class="fas fa-arrow-up"></span>
                    </button>
                    <button name="downvote" class={"btn btn-sm "
                      + (vote.get("score") < 0 ? "btn-danger" : "btn-outline-secondary")}>
                      <span class="fas fa-arrow-down"></span>
                    </button>
                  </form>
                </td><td class="theme-past__label">
                  {vote.related("theme").get("title")}
                </td></tr>
              </table>
            </div>
          </div>;
        }
      })}
    </div>

    <script id="js-theme-vote-template" type="text/template" dangerouslySetInnerHTML={{
      __html: `
            <% if (theme) { %>
            <p>Would this make a good theme for the jam?</p>
            <table>
            <tr><td class="theme-vote__buttons">
              <form id="js-vote-form" method="post">
                ${csrfTokenHTML()}
                <input type="hidden" name="action" value="vote" />
                <input type="hidden" name="theme-id" id="js-theme-id" value="<%- theme.id %>" />
                <button id="js-upvote" name="upvote" class="btn btn-outline-secondary"><span class="fas fa-arrow-up"></span></button>
                <button id="js-downvote" name="downvote" class="btn btn-outline-secondary"><span class="fas fa-arrow-down"></span></button>
              </form>
            </td><td id="js-theme-title" class="theme-vote__label">
              <%- theme.title %>
            </td></tr>
            </table>
            <% } else { %>
            <p>No more themes to vote on!</p>
            <p>If you leave this page open, it will refresh every five minutes.</p>
            <% } %>
          `}} />

    <script id="js-theme-vote-history-template" type="text/template" dangerouslySetInnerHTML={{
      __html: `
            <div class="col-sm-6">
              <div class="theme-past">
                <table class="js-theme-vote-history-block" style="display: none">
                <tr><td class="theme-past__buttons">
                  <form method="post">
                    ${csrfTokenHTML()}
                    <input type="hidden" name="action" value="vote" />
                    <input type="hidden" name="theme-id" value="<%- theme.id %>" />
                    <button name="upvote" class="btn <%- theme.upvote ? 'btn-success' : 'btn-outline-secondary' %> btn-sm">
                      <span class="fas fa-arrow-up"></span></button>
                    <button name="downvote" class="btn <%- theme.downvote ? 'btn-danger' : 'btn-outline-secondary' %> btn-sm">
                      <span class="fas fa-arrow-down"></span></button>
                  </form>
                </td><td class="theme-past__label">
                  <%- theme.title %>
                </td></tr>
                </table>
              </div>
            </div>
          `}} />
  </div>;
}
