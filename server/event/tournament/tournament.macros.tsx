import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import { ordinal } from "server/core/formats";
import forms from "server/core/forms";
import { EventParticipation } from "server/entity/event-participation.entity";
import { User } from "server/entity/user.entity";
import * as userMacros from "server/user/user.macros";

export function userRanking(user: User, event: BookshelfModel, eventParticipation: EventParticipation,
                            tournamentScore: BookshelfModel, options: { compact?: boolean } = {}) {
  if (user && (!event.related("details").get("flags").streamerOnlyTournament || eventParticipation.isStreamer)) {
    return <div class={"tournament-user-banner " + (options.compact ? "py-0" : "")}>
      <div class="tournament-user-banner__user">{userMacros.userAvatar(user, { small: true })}</div>
      <div class="tournament-user-banner__ranking text-center">
        <div class="d-inline-block text-left">
          <h1>{ordinal((tournamentScore.get("ranking") || (event.get("tournament_count") + 1)))} {options.compact ? "" : "place"}</h1>
          <span class="count"> out of {event.get("tournament_count")}</span>
        </div>
      </div>
      <div class="tournament-user-banner__points">
        <h3>{forms.parseInt((tournamentScore.get("score") || 0))} pts.</h3>
      </div>
    </div>;
  }
}
