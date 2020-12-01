import * as React from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { ifTrue } from "server/macros/jsx-utils";
import { entryRatingForm } from "./entry-rating-form.template";
import { entryRatingCountPhrase } from "./entry-rating-count-phrase.template";

export function entryRating(event, entry, entryVotes, user, canVoteOnEntry, vote, minEntryVotes, csrfToken) {
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
            <p>This game is an <strong>Unranked</strong> entry.</p>
            <p>Voting is disabled, please provide feedback instead.</p>
            <p style="margin-bottom: 0">
              <i>Note: The Karma formula grants you as many points on this entry as on ranked ones.
                {" "}<a href="/article/docs/faq#karma-intro">Learn more</a></i>
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
          </div>
        </div>;
      } else {
        // Own entry that cannot be ranked
      }
    } else {
      // Non-jam entrant
      return <div class="entry-voting">
        <h2 class="entry-voting__header">Game ratings</h2>
        <div class="entry-voting__body">
          {entryRatingCountPhrase(entry, entryVotes)}
          <p>Because you didn't enter the event, you cannot rate this game. You can still provide feedback using comments!</p>
        </div>
      </div>;
    }
  }
}
