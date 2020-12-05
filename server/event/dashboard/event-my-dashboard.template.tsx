import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifTrue } from "server/macros/jsx-utils";
import * as jumbotronMacros from "server/macros/jumbotron.macros";
import { eventDashboardBlogPosts } from "./components/blog-posts.component";
import { eventDashboardStreamerEntry } from "./components/streamer-entry.component";
import { eventDashboardThemes } from "./components/themes.component";
import { eventDashboardUsefulLinks } from "./components/useful-links.component";

export default function render(context: CommonLocals): JSX.Element {
  const { eventParticipation, event, user, userLikes, posts, latestPost, entry } = context;
  const socialLinks = user.related("details").get("social_links") || {};

  context.inlineStyles.push(`
  .main-action-banners .action-banner {
    min-height: 110px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }
  `);

  return base(context,

    <div class="container">
      <h1>{event.get("title")} dashboard</h1>

      {formMacros.alerts(context.alerts)}

      <div class="row mt-4">
        <div class="col-md-3 col-12">
          <h2 class="mb-2">Useful links</h2>
          {eventDashboardUsefulLinks(event)}

          <h2 class="mb-2 mt-4">Event stats</h2>
          <div class="card card-body">
            {jumbotronMacros.statsCounters(event)}
          </div>
        </div>

        <div class="col-md-9 col-12">
          <div class="mb-3">
            <h2><span class="fa fa-gamepad"></span> Entry</h2>
            <div class="row main-action-banners">
              <div class="col-lg-7">
                <h3>As jammer</h3>
                {eventMacros.eventShortcutMyEntry(event, entry, { noTitle: true })}
              </div>
              <div class="col-lg-5">
                <h3>As streamer</h3>
                {eventDashboardStreamerEntry(eventParticipation, event, socialLinks, user, context.csrfToken)}
              </div>
            </div>

          </div>

          {ifTrue(event.get("status_theme") !== "disabled", () =>
            <div>
              <h2><span class="fa fa-lightbulb"></span> Themes</h2>
              {eventDashboardThemes(event)}
            </div>
          )}

          <div class="mt-4">
            <h2><span class="fa fa-newspaper"></span> Blog posts</h2>
            {eventDashboardBlogPosts(user, event, entry, posts, latestPost, userLikes)}
          </div>

          <div class="mt-5">
            {ifTrue(eventParticipation.isStreamer, () =>
              <form method="post" class="d-inline">
                {context.csrfToken()}
                <input type="hidden" name="is-streamer" value="false" />
                <button type="submit" name="streamer-preferences" class="btn btn-danger mr-1"
                  onclick="return confirm('Cancel participation as streamer? You can return at any time until the end of jam.')">
                  Cancel participation as streamer
                </button>
              </form>
            )}
            <a href={links.routeUrl(event, "event", "join") + "?leave"} class="btn btn-danger"
              onclick="return confirm('Leave the event? You can return at any time.')">
              Leave event
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}

