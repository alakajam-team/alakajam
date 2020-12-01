import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import forms from "server/core/forms";
import { digits } from "server/core/templating-filters";
import { User } from "server/entity/user.entity";
import { ifSet, ifTrue } from "server/macros/jsx-utils";

export function themeStats(event: BookshelfModel, user: User, userThemes: BookshelfModel[], voteCount: number, shortlistVotes: number) {
  return <div class="card card-body">
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
        {ifSet(shortlistVotes, () =>
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
  </div>;
}
