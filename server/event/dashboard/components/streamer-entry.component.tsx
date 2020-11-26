import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import { EventParticipation } from "server/entity/event-participation.entity";
import { User } from "server/entity/user.entity";
import * as formMacros from "server/macros/form.macros";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as userMacros from "server/user/user.macros";

export function eventDashboardStreamerEntry(eventParticipation: EventParticipation, event: BookshelfModel,
                                            socialLinks: Record<string, string>, user: User, csrfToken: () => JSX.Element): JSX.Element {
  return <form method="post" class="action-banner text-center">
    {csrfToken()}

    {ifTrue(eventParticipation.isStreamer, () =>
      <>
        <p>You are entering the event as a streamer!</p>
        {ifSet(socialLinks.twitch, () =>
          <span class="alert alert-light">
            {userMacros.twitchLink(user)}<br />
            {ifTrue(eventParticipation.streamerStatus === "requested", () =>
              <span class="badge badge-warning">
                Pending approbation {formMacros.tooltip("The mods make a simple check, "
                + "usually within 24 hours, to filter possible spammers and multiple accounts.")}
              </span>
            )}
            {ifTrue(eventParticipation.streamerStatus === "approved", () =>
              <span class="badge badge-success">Approved</span>
            )}
          </span>
        )}
        {ifNotSet(socialLinks.twitch, () =>
          <span class="alert alert-warning"><span class="fa fa-exclamation-triangle"></span> Unknown Twitch channel</span>
        )}
        {ifNotSet(eventParticipation.streamerDescription, () =>
          <span class="alert alert-warning"><span class="fa fa-exclamation-triangle"></span> Stream schedule not set</span>
        )}
        <a href={links.routeUrl(event, "event", "dashboard-streamer-preferences")} class="btn btn-primary">Manage streamer settings</a>
      </>
    )}

    {ifTrue(event.get("status") !== "closed" && !eventParticipation.isStreamer, () => {
      if (socialLinks.twitch) {
        return <div>
          <input type="hidden" name="is-streamer" value="true" />
          <button type="submit" name="streamer-preferences" class="btn btn-primary btn-lg">
            <span class="fas fa-video"></span>&nbsp;
            Enter as streamer
          </button>
        </div>;
      } else {
        return <div>
          <p>A Twitch channel must be set before joining</p>
          <a href={links.routeUrl(user, "user", "settings")} class="btn btn-outline-primary btn-lg">Manage account settings</a>
        </div>;
      }
    })}

    {ifTrue(event.get("status") === "closed" && !eventParticipation.isStreamer, () =>
      <div>
        <p>Streamer entries are now closed.</p>
        <p><a href="/events" class="btn btn-secondary">Explore our upcoming events</a></p>
      </div>
    )}
  </form>;
}
