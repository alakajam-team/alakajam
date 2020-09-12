import { range } from "lodash";
import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import { ordinal } from "server/core/formats";
import forms from "server/core/forms";
import links from "server/core/links";
import { digits, markdown } from "server/core/templating-filters";
import * as eventMacros from "server/event/event.macros";
import { ifFalse, ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";

export default function render(context: CommonLocals) {
  const { event, themesPost, user, userLikes, votingAllowed, sampleThemes, userRanks,
    shortlist, randomizedShortlist, hasRankedShortlist, shortlistVotes, activeShortlist, eliminatedShortlist,
    ideasRequired, eliminationMinNotes,
    voteCount, votesHistory, maxThemeSuggestions, infoMessage, path } = context;
  const shortlistEliminationInfo = event.related("details").get("shortlist_elimination");
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
          {ifTrue(shortlistEliminationInfo.start && shortlistEliminationInfo.body, () =>
            <div class="card mb-3">
              <div class="card-body user-contents" dangerouslySetInnerHTML={markdown(shortlistEliminationInfo.body)} />
            </div>
          )}

          <div class="row">
            <div class="col-md-4">
              <div id="js-view-themes">
                <h2>My theme ideas</h2>
                <div class="card themes__ideas">
                  {ifTrue(user && event.get("status_theme") === "voting", () =>
                    <div class="themes__idea">
                      <p>
                        <button class="btn btn-primary js-show js-hide"
                          data-show-selector="#js-manage-themes"
                          data-hide-selector="#js-view-themes">
                          <span class="fas fa-pencil-alt mr-1"></span>
                          Manage theme ideas
                        </button>
                      </p>
                    </div>
                  )}
                  {userThemes.map(userTheme =>
                    <div class="themes__idea">
                      <div class="themes__idea-label">
                        {userTheme.get("title")}
                      </div>
                      {userTheme ? themeDetails(userTheme) : undefined}
                    </div>
                  )}
                  {ifTrue(userThemes.length === 0, () =>
                    <div class="themes__idea">
                      {ifTrue(event.get("status_theme") === "voting", () =>
                        <div>
                          <p style="margin-bottom: 10px">None yet. You can submit up to {maxThemeSuggestions} ideas.</p>
                          {ifNotSet(user, () =>
                            <p><a href={`/login?redirect=${encodeURIComponent(path)}`} class="btn btn-primary">Login to submit ideas</a></p>
                          )}
                        </div>
                      )}
                      {ifTrue(event.get("status_theme") !== "voting", () => {
                        if (user) {
                          return "You didn't submit theme ideas.";
                        } else {
                          return <p><a href={`/login?redirect=${encodeURIComponent(path)}`} class="btn btn-primary">Login to view your ideas</a></p>;
                        }
                      })}
                    </div>
                  )}
                </div>
              </div>

              <form id="js-manage-themes" method="post" class="js-warn-on-unsaved-changes d-none">
                {context.csrfToken()}

                <h2>My theme ideas</h2>
                {myThemeIdeas(event, userThemes, maxThemeSuggestions)}
              </form>

              <div class="themes__stats">
                <h2>Stats</h2>
                <div class="card card-body">
                  {ifSet(user, () =>
                    <div class="row">
                      <div class="col-4"><b>You</b></div>
                      <div class="col-3">{userThemes.length} ideas</div>
                      <div class="col-5"><span id="js-user-votes">{voteCount}</span> votes</div>
                    </div>
                  )}
                  <div class="row">
                    <div class="col-4"><b>Everyone</b></div>
                    <div class="col-3">{event.related("details").get("theme_count") || "0"} ideas</div>
                    <div class="col-5">
                      <span id="js-total-votes">{event.related("details").get("theme_vote_count") || "0"}</span> votes
                      {ifTrue(shortlistVotes, () =>
                        <div>{shortlistVotes} shortlist votes</div>
                      )}
                    </div>
                  </div>
                  {ifTrue(event.get("status_theme") === "voting", () => {
                    const activePercentage = digits(100 * event.related("details").get("active_theme_count")
                      / event.related("details").get("theme_count") || 100, 0);
                    return <div class="progress my-1">
                      <div class="progress-bar bg-light text-muted" role="progressbar"
                        style={`width: ${activePercentage}%`}>{event.related("details").get("active_theme_count")} Active</div>
                      <div class="progress-bar bg-secondary" role="progressbar"
                        style={`width: ${100 - forms.parseInt(activePercentage)}%`}>
                        {event.related("details").get("theme_count") - event.related("details").get("active_theme_count")} Out</div>
                    </div>;
                  })}
                </div>

                <div class="mt-3 d-none d-md-block">
                  <h2>How it works</h2>
                  <ul>
                    <li>The lowest ranking themes (having {eliminationMinNotes} votes or more) are eliminated regularly.</li>
                    <li>After one week, only the {constants.SHORTLIST_SIZE} best themes will remain.
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

                  {ifSet(user, () =>
                    <div>
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
                                      {context.csrfToken()}
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
                    </div>
                  )}
                  {ifNotSet(user, () => {
                    if (votingAllowed) {
                      return <div>
                        <p>Here are some of the ideas submitted to the event.
                          <a href={`/login?redirect=${encodeURI(path)}`} class="btn btn-primary">Login to vote</a></p>
                        {sampleThemes.map(theme =>
                          <div class="card card-body mb-3"><h1 class="m-0">{theme.get("title")}</h1></div>
                        )}
                      </div>;
                    } else {
                      return `Voting will start when at least ${ideasRequired} ideas are submitted.`;
                    }
                  })}
                </div>
              )}

              {ifTrue(event.get("status_theme") === "shortlist" || event.get("status_theme") === "closed", () => {
                const shortlistVote = (user && event.get("status_theme") === "shortlist");

                return <div class="themes__shortlist">
                  <form method="post" class="js-warn-on-unsaved-changes">
                    {context.csrfToken()}
                    <input type="hidden" name="action" value="shortlist" />

                    <h2>Shortlist ranking</h2>
                    <input id="js-shortlist-votes" type="hidden" name="shortlist-votes" />
                    <div class="card card-body">
                      <p>
                        {shortlistMessage(user, randomizedShortlist, shortlistVote, hasRankedShortlist)}
                      </p>
                      {ifTrue(eliminatedShortlist.length > 0, () =>
                        <p>The greyed out themes have been eliminated, only {10 - eliminatedShortlist.length} remain in competition!</p>
                      )}
                      <p>
                        {ifTrue(shortlistVote, () =>
                          <input id="js-shortlist-submit" type="submit" class="btn btn-primary disabled" value="Save changes" disabled />
                        )}
                        {ifTrue(!shortlistVote && event.get("status_theme") === "shortlist", () =>
                          <a href={"/login?redirect=" + encodeURI(path)} class="btn btn-primary">Log in to rank the shortlist</a>
                        )}
                      </p>
                      <ol id={shortlistVote ? "js-shortlist" : ""} class={shortlistVote ? "use-hover" : ""}>
                        {activeShortlist.map(theme => {
                          const forcedFontSize = (eliminatedShortlist.length > 0) ? (19 + eliminatedShortlist.length) : undefined;
                          return <li class={"theme-shortlist-line " + (shortlistVote ? "draggable" : "")} data-theme-id={theme.get("id")}>
                            {ifTrue(shortlistVote, () =>
                              <span class="theme-shortlist-line__handle fas fa-bars"></span>
                            )}
                            <span class="theme-shortlist-line__label"
                              style={forcedFontSize ? `font-size: ${forcedFontSize}px` : ""}>{theme.get("title")}</span>
                          </li>;
                        })}
                        {eliminatedShortlist.map(theme =>
                          <li class={"theme-shortlist-line eliminated " + (shortlistVote ? "draggable-list" : "")} data-theme-id={theme.get("id")}>
                            <span class="theme-shortlist-line__label">{theme.get("title")}</span>
                          </li>
                        )}
                      </ol>
                    </div>
                  </form>
                </div>;
              })}

              {ifTrue(event.get("status_theme") === "results", () =>
                <div class="themes__results">
                  <h2>Shortlist results</h2>
                  <div class="card card-body">
                    <p>
                      {ifTrue(userRanks, () =>
                        <span class="theme-shortlist-line__score">Your picks</span>
                      )}
                      <span class="theme-shortlist-line__score d-none d-sm-block">Score</span>
                      {ifTrue(shortlist.length > 0, () =>
                        <span>The theme of the <em>{event.get("title")}</em> is <strong>{shortlist[0].get("title")}</strong>.
                          Here are the detailed voting results:</span>
                      )}
                    </p>
                    <ol>
                      {shortlist.map((theme, index) =>
                        <li class={"theme-shortlist-line " + (index === 0 ? "winner" : "")}>
                          <span class="theme-shortlist-line__label">{theme.get("title")}</span>
                          {ifTrue(userRanks, () =>
                            <span class="theme-shortlist-line__ranking">{ordinal(userRanks[theme.get("id")])}</span>
                          )}
                          <span class="theme-shortlist-line__score d-none d-sm-block">{theme.get("score") > 0 ? "+" : ""}{theme.get("score")}</span>
                        </li>
                      )}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>

          <script id="js-theme-vote-template" type="text/template" dangerouslySetInnerHTML={{
            __html: `
            <% if (theme) { %>
            <p>Would this make a good theme for the jam?</p>
            <table>
            <tr><td class="theme-vote__buttons">
              <form id="js-vote-form" method="post">
                ${context.csrfTokenHTML()}
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
                    ${context.csrfTokenHTML()}
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
        </div>
      )}
    </div>);
}

function shortlistMessage(user, randomizedShortlist, shortlistVote, hasRankedShortlist) {
  if (randomizedShortlist) {
    return <span>These are the top submitted ideas, in random order.
      {user ? "Rank them by using drag'n'drop: move them up the order to give them more points!" : ""}</span>;
  } else if (shortlistVote) {
    if (hasRankedShortlist) {
      return "Here are the top submitted ideas as you ranked them. "
        + "You can still drag'n'drop them, move themes up the order to give them more points!";
    } else {
      return "Here are the top submitted ideas as you ranked them during the first vote phase. "
        + "You can still drag'n'drop them, move themes up the order to give them more points!";
    }
  } else if (hasRankedShortlist) {
    return "Here are the top submitted ideas as you ranked them. You can no longer change your vote.";
  } else {
    return "Here are the top submitted ideas, in random order. It is now too late to rate them.";
  }
}

function myThemeIdeas(event, userThemes, maxThemeSuggestions) {
  const ideaRows = Math.max(userThemes.length, maxThemeSuggestions);

  return <div class="card themes__ideas">
    {range(0, ideaRows).map(index => {
      const userTheme = userThemes.length > index ? userThemes[index] : undefined;
      return <div class={"themes__idea " + (userTheme ? "form-inline" : "")}>
        <input type="text" id={"idea-title-" + index} name={`idea-title[${index}]`}
          class="form-control input-lg" readonly={Boolean(userTheme)}
          placeholder={"Idea " + (index + 1)} value={userTheme ? userTheme.get("title") : ""} />
        {ifTrue(userTheme, () =>
          ifTrue(userTheme.get("status") === "duplicate" || userTheme.get("status") === "active", () =>
            <button type="button" class="js-idea-delete themes__idea-delete form-control btn btn-outline-danger ml-1">
              <span class="fas fa-trash"></span>
            </button>
          )
        )}
        <input type="hidden" name={`idea-id[${index}]`} value={userTheme ? userTheme.get("id") : ""} />
        {userTheme ? themeDetails(userTheme) : undefined}
      </div>;
    })}
    <div class="form-group themes__idea mt-0 mb-0">
      <input type="hidden" name="action" value="ideas" />
      <input type="hidden" name="idea-rows" value={ideaRows} />
      <input type="submit" class="btn btn-primary mr-1" value="Save" />
      <a href={links.routeUrl(event, "event", "themes")} class="btn btn-outline-secondary">Cancel</a>
    </div>
  </div>;
}

function themeDetails(userTheme) {
  const themeStatus = userTheme ? userTheme.get("status") : undefined;
  return <p>
    {eventMacros.eventThemeStatus(userTheme)}
    {" "}
    {ifTrue(themeStatus !== "duplicate", () => {
      if (themeStatus === "out" || themeStatus === "banned") {
        return <span>Out after {userTheme.get("notes")} votes</span>;
      } else if (themeStatus !== "duplicate") {
        return <span>Rated {userTheme.get("notes")} time{userTheme.get("notes") !== 1 ? "s" : ""}</span>;
      }
    })}
  </p>;
}
