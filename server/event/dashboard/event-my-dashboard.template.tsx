import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import forms from "server/core/forms";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as jumbotronMacros from "server/macros/jumbotron.macros";
import * as postMacros from "server/post/post.macros";
import * as userMacros from "server/user/user.macros";

export default function render(context: CommonLocals) {
  const { eventParticipation, event, user, userLikes, posts, latestPost, entry } = context;
  const rulesLink = forms.isId(event.get("status_rules")) ? links.routeUrl(event.get("status_rules"), "post") : event.get("status_rules");
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

          {ifTrue(rulesLink !== "off", () =>
            <div class="list-group mb-1">
              {usefulLink(event, "status_rules", rulesLink, "Detailed rules", "fa-book", { big: true })}
            </div>
          )}

          <div class="list-group">
            {/* usefulLink(event, null, 'posts', 'Posts', 'fa-newspaper') */}
            {event.related("details").get("links").map(featuredLink =>
              usefulLink(event, null, featuredLink.link, featuredLink.title, featuredLink.icon)
            )}
          </div>

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
                {eventMacros.eventShortcutMyEntry(user as any, event, entry, { noTitle: true })}
              </div>
              <div class="col-lg-5">
                <h3>As streamer</h3>

                <form method="post" class="action-banner text-center">
                  {context.csrfTokenJSX()}

                  {ifTrue(eventParticipation.isStreamer, () =>
                    <div>
                      <p>You are entering the event as a streamer!</p>
                      {ifSet(socialLinks.twitch, () =>
                        <span class="alert alert-light">
                          {userMacros.twitchLink(user)}<br />
                          {ifTrue(eventParticipation.streamerStatus === "requested", () =>
                            <span class="badge badge-warning">
                              Pending approbation
                              {formMacros.tooltip("The mods make a simple check, "
                                + "usually within 24 hours, to filter possible spammers && multiple accounts.")}
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
                    </div>
                  )}

                  {ifTrue(event.get("status") !== "closed" && !eventParticipation.isStreamer, () => {
                    if (socialLinks.twitch) {
                      return <div>
                        <input type="hidden" name="is-streamer" value="true" />
                        <button type="submit" name="streamer-preferences" class="btn btn-primary btn-lg">
                          <span class="fas fa-video"></span>
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
                </form>
              </div>
            </div>

          </div>

          {ifTrue(event.get("status_themes") !== "disabled", () =>
            <div>
              <h2><span class="fa fa-lightbulb"></span> Themes</h2>

              {ifTrue(event.get("status_theme") === "off", () =>
                <div class="card card-body">
                  <h4>Theme submissions are !open yet.</h4>
                </div>
              )}
              {ifTrue(event.get("status_theme") !== "off", () =>
                <a href={links.routeUrl(event, "event", "themes")} class="btn btn-primary">Browse themes</a>
              )}
            </div>
          )}

          <div class="mt-4">
            <h2><span class="fa fa-newspaper"></span> Blog posts</h2>

            <p class="mt-3">{eventMacros.eventShortcutMyPost(user as any, event, latestPost, { buttonsOnly: true })}</p>

            {ifTrue(posts.length === 0, () =>
              <div class="card card-body">
                <h4>You don't have posts on this event yet.</h4>
                {ifTrue(event.get("status_entry") === "off", () =>
                  <p>Make a blog post to present yourself and share your plans for the jam!</p>
                )}
                {ifSet(entry, () =>
                  <p>Telling your experience with a post is a good way to share what you learnt and exchange impressions!</p>
                )}
              </div>
            )}

            <div class="mt-4">
              {posts.map(post => { postMacros.post(post, { hideBody: true, smallTitle: true, readingUser: user, readingUserLikes: userLikes }); }
              )}
            </div>
          </div>

          <div class="mt-5">
            {ifTrue(eventParticipation.isStreamer, () =>
              <form method="post" class="d-inline">
                {context.csrfTokenJSX()}
                <input type="hidden" name="is-streamer" value="false" />
                <button type="submit" name="streamer-preferences" class="btn btn-danger"
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

function usefulLink(event, statusField, link, title, icon, options = {}) {
  if (!statusField || event.get(statusField) !== "disabled") {
    const targetUrl = link.includes("/") ? link : links.routeUrl(event, "event", link);
    return <a class="list-group-item {'big' if options.big }} shortcut" href={targetUrl}>
      <h4>
        <span class="shortcut__icon"><span class="fas {icon}"></span></span>
        <span class="shortcut__title">{title}</span>
      </h4>
    </ a>;

  }
}
