import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifTrue, ifSet, ifNotSet } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";
import dashboardBase from "./dashboard.base.template";

export default function render(context: CommonLocals) {
  const { invites, toUser, user, notificationsLastRead, latestEntry, dashboardUser, latestPosts, byUser } = context;

  return dashboardBase(context, <div>
    <div class="row">
      <div class="col-md-7 col-lg-6">
        <h1>Notifications {formMacros.tooltip("This feed lists all comments people wrote on your entries && posts,"
          + ' plus any comments mentioning "@' + user.get("name") + '".')}</h1>

        {invites.map(invite => {
          const inviteEntry = invite.related("entry");
          return <div data-test="invites" class="card card-body">
            <h3>
              {ifSet(inviteEntry.get("event_id"), () =>
                <a href={links.routeUrl(inviteEntry.related("event"), "event")}>{ inviteEntry.related("event").get("title")}</a>
              )}
              {ifNotSet(inviteEntry.get("event_id"), () =>
                <strong>{inviteEntry.get("external_event")}</strong>
              )}
            </h3>
            <p>You have been invited to join a team.

            </p>
            <div class="row">
              <div class="col-8 offset-2">
                {eventMacros.entrySmallThumb(inviteEntry)}
                <div class="text-right spacing">
                  <a href={links.routeUrl(inviteEntry, "entry", "accept-invite")} class="btn btn-primary">Accept</a>
                  <a href={links.routeUrl(inviteEntry, "entry", "decline-invite")} class="btn btn-outline-primary">Decline</a>
                </div>
              </div>
            </div>
          </div>;
        })}

        {ifTrue(toUser.length > 0, () =>
          postMacros.comments(toUser, { readingUser: user, readOnly: true, linkToNode: true, highlightNewerThan: notificationsLastRead })
        )}
        {ifTrue(toUser.length === 0, () =>
          <div data-test="notifications" class="card card-body">No notifications yet.</div>
        )}
      </div>
      <div class="col-md-5 col-lg-6">
        <h1>Shortcuts</h1>

        <div class="horizontal-bar">Latest entry</div>

        {ifSet(latestEntry, () =>
          <div class="row">
            <div class="col-lg-8">
              {eventMacros.entryThumb(latestEntry, { showEvent: true })}
            </div>
          </div>
        )}
        {ifNotSet(latestEntry, () =>
          <div class="card card-body">No entry yet.</div>
        )}
        <div style="margin: 10px 0 20px 0; clear: both">
          <a href={links.routeUrl(dashboardUser, "user", "entries")} class="btn btn-outline-primary">All entries</a>
        </div>

        <div class="horizontal-bar">Latest posts</div>

        <div class="list-group">
          {latestPosts.map( post =>
            <div class="list-group-item">
              {postMacros.post(post, { hideDetails: true, readingUser: user, readingUserLikes: {}, smallTitle: true })}
            </div>
          )}
        </div>

        {ifTrue(latestPosts.length === 0, () =>
          <div class="card card-body">No posts yet.</div>
        )}

        <div class="mt-2">
          <a href={links.routeUrl(dashboardUser, "user", "posts")} class="btn btn-outline-primary mr-1">All posts</a>
          <a href={links.routeUrl(null, "post", "create")} class="btn btn-primary">Create post</a>
        </div>

        <div class="horizontal-bar">Latest comments</div>

        {postMacros.comments(byUser, { readingUser: user, readOnly: true, linkToNode: true })}
      </div>
    </div>
  </div>);
}
