import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { EventFlags } from "server/entity/event-details.entity";
import { User } from "server/entity/user.entity";
import { eventRulesLink } from "server/event/event.macros";
import { ifTrue } from "server/macros/jsx-utils";
import { entryRatingCountPhrase } from "./entry-rating-count-phrase.template";
import { entryRatingForm } from "./entry-rating-form.template";

export function entryRating(event: BookshelfModel, entry: BookshelfModel, entryVotes: number, user: User, canVoteOnEntry: boolean,
  vote: BookshelfModel, minEntryVotes: number, csrfToken: () => JSX.Element): JSX.Element {
  const flags: EventFlags = event.related<BookshelfModel>("details").get("flags");

  if (canVoteOnEntry) {
    // Jam entrant who can vote on this entry
    return <div class="entry-voting">
      <h2 class="entry-voting__header">
        <div class="float-right">
          <a href={links.routeUrl(event, "event", "ratings")} class="btn btn-outline-light btn-sm">Manage my ratings</a>
        </div>
        Game ratings
      </h2>
      <div class="entry-voting__body">
        {ifTrue(entry.get("division") === "unranked", () =>
          <div>
            <p>This game is an <strong>unranked</strong> entry.{" "}
            Most rules from the ranked competition do not apply, following the theme is not required either {" "}
            (see <a href={eventRulesLink(event) + "#open-division"}>Docs</a> for more info).</p>
            <p>Voting is disabled, please provide feedback instead to earn Karma.</p>
            <p style="margin-bottom: 0">
              <i>Note: The Karma formula grants you as many points on this entry as on ranked ones.
                {" "}<a href="/article/docs/faq#what-is-karma">Learn more</a></i>
            </p>
          </div>
        )}
        {ifTrue(entry.get("division") !== "unranked", () =>
          entryRatingForm(entry, entryVotes, event, csrfToken, vote)
        )}
      </div>
    </div>;

  } else {
    if (security.canUserWrite(user, entry)) {
      if (entry.get("division") !== "unranked") {
        // Own entry that can be ranked
        return <div class="entry-voting">
          <h2 class="entry-voting__header">Game ratings</h2>
          <div class="entry-voting__body">
            <p>You have received <strong>{entryVotes}</strong> rating{entryVotes !== 1 ? "s" : ""} so far.</p>
            {ifTrue(entryVotes < minEntryVotes, () =>
              <p>You need at least <strong>{minEntryVotes}</strong> ratings for your game to receive rankings.</p>
            )}
            {ifTrue(flags.rankedKarmaModifier && entryVotes >= minEntryVotes, () =>
              <p>Now that you have sufficient ratings, your karma has been lowered to help other games.</p>
            )}
          </div>
        </div>;
      } else {
        // Own entry that cannot be ranked
        return <>
          {ifTrue(flags.rankedKarmaModifier && entry.get("comment_count") > minEntryVotes, () =>
            <p>Now that you have more than <strong>{minEntryVotes}</strong> comments, your karma has been lowered to help other games.</p>
          )}
        </>;
      }
    } else {
      // Non-jam entrant
      return <div class="entry-voting">
        <h2 class="entry-voting__header">Game ratings</h2>
        <div class="entry-voting__body">
          {ifTrue(entry.get("division") === "unranked", () =>
            <p>This game is an <strong>unranked</strong> entry.</p>
          )}
          {ifTrue(entry.get("division") !== "unranked", () =>
            entryRatingCountPhrase(entry, entryVotes)
          )}
          <p>Because you didn't enter the event, you cannot rate this game. You can still provide feedback using comments!</p>
        </div>
      </div>;
    }
  }
}
