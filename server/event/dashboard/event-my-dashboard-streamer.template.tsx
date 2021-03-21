import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as streamersDocMacros from "server/event/streamers/streamers-doc.template";
import * as formMacros from "server/macros/form.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { event, user, eventParticipation } = context;

  formMacros.registerEditorScripts(context);

  return base(context,
    <div class="container">
      <h1><a href={links.routeUrl(event, "event", "dashboard")}>{event.get("title")} dashboard</a>: Streamer settings</h1>

      {formMacros.alerts(context.alerts)}

      <div class="row">
        <div class="col-md-6">
          <form method="post">
            <h2>
              Update your settings
              <a href={links.routeUrl(event, "event", "dashboard")} class="btn btn-sm btn-outline-secondary ml-1">Back to dashboard</a>
            </h2>

            {context.csrfToken()}

            <div class="form-group">
              <label for="twitch">
                <img src={links.staticUrl("/static/images/social/twitch.png")} class="no-border" style="width: 20px" autofocus />
                Twitch username
              </label>
              <input type="text" class="form-control form-control-lg" id="twitch"
                name="twitch" value={user.details.social_links?.twitch} required />
              <p class="legend mb-0">This field can also be set from your&nbsp;
                <a href={links.routeUrl(user, "user", "settings")}>account settings</a>.</p>
            </div>

            <div class="form-group">
              <label for="youtube">
                <img src={links.staticUrl("/static/images/social/youtube.svg")} class="no-border" style="width: 20px" />
                YouTube channel URL
              </label>
              <input type="text" class="form-control form-control-lg" id="youtube"
                name="youtube" value={user.details.social_links?.youtube} required />
              <p class="legend mb-0">This field can also be set from your&nbsp;
                <a href={links.routeUrl(user, "user", "settings")}>account settings</a>.</p>
            </div>

            <div class="form-group">
              <label for="twitch">Stream schedule</label>
              <div class="text-muted">Use this area to tell the public:
                <ul class="text-muted mt-0">
                  <li>What you plan to stream (playing games, game development, etc.) ;</li>
                  <li>When you will go live, so they can now when to tune in to your channel.</li>
                </ul>
              </div>
              {formMacros.editor("streamer-description", eventParticipation.streamerDescription)}
            </div>

            <div class="form-group text-right">
              <button type="submit" name="submit" class="btn btn-primary">Save changes</button>

              <button type="submit" name="cancel-participation" class="btn btn-danger float-left" formnovalidate
                onclick="return confirm('Cancel participation as streamer? You can return at any time until the end of jam.')">
                Cancel participation as streamer
              </button>
            </div>
          </form>

        </div>
        <div class="col-md-6">
          {streamersDocMacros.streamersDoc(context, event)}
        </div>
      </div>
    </div>);
}
