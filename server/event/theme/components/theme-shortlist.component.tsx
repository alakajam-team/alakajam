import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import { createLuxonDate } from "server/core/formats";
import { ThemeShortlistEliminationState } from "server/entity/event-details.entity";
import { User } from "server/entity/user.entity";
import { ifSet, ifTrue } from "server/macros/jsx-utils";

export function themeShortlist(event: BookshelfModel, user: User,
  randomizedShortlist: BookshelfModel[], activeShortlist: BookshelfModel[], eliminatedShortlist: BookshelfModel[],
  hasRankedShortlist: boolean, csrfToken: () => JSX.Element, path: string): JSX.Element {

  const shortlistVote = (user && event.get("status_theme") === "shortlist");

  return <div class="themes__shortlist">
    <form method="post" class="js-warn-on-unsaved-changes">
      {csrfToken()}
      <input type="hidden" name="action" value="shortlist" />

      <h2>Shortlist ranking</h2>
      <input id="js-shortlist-votes" type="hidden" name="shortlist-votes" />
      <div class="card card-body">
        {shortlistMessage(user, randomizedShortlist, shortlistVote, hasRankedShortlist)}
        <h3>{eliminatedShortlist.length > 0 ? "Active themes" : ""}</h3>
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
        </ol>
        {ifTrue(eliminatedShortlist.length > 0, () => {
          const shortlistElimination: ThemeShortlistEliminationState = event.related("details").get("shortlist_elimination");
          return <>
            <h3>Eliminated themes</h3>
            <p>
              The weakest theme is eliminated regularly until the start of the jam.
              {ifSet(shortlistElimination.nextElimination, () =>
                <>The next one will be eliminated <b>{createLuxonDate(shortlistElimination.nextElimination).toRelative()}</b>.</>
              )}
            </p>
            <ol start={activeShortlist.length + 1}>
              {eliminatedShortlist.map(theme =>
                <li class="theme-shortlist-line eliminated not-sortable" data-theme-id={theme.get("id")}>
                  <span class="theme-shortlist-line__label">{theme.get("title")}</span>
                </li>
              )}
            </ol>
          </>;
        })}
      </div>
    </form>
  </div>;
}

function shortlistMessage(user: User, randomizedShortlist: BookshelfModel[], shortlistVote: boolean, hasRankedShortlist: boolean) {
  if (randomizedShortlist) {
    return <span>These are the top submitted ideas, in random order.
      {user ? " Rank them by using drag'n'drop: move them up the order to give them more points!" : ""}</span>;
  } else if (shortlistVote) {
    if (hasRankedShortlist) {
      return "Here are the top submitted ideas as you ranked them. "
        + "You can still drag'n'drop them, move themes up the order to give them more points!";
    } else {
      return "Here are the top submitted ideas as you rated them during the first vote phase. "
        + "You can still drag'n'drop them, move themes up the order to give them more points!";
    }
  } else if (hasRankedShortlist) {
    return "Here are the top submitted ideas as you ranked them. You can no longer change your vote.";
  } else {
    return "Here are the top submitted ideas, in random order. It is now too late to rate them.";
  }
}
