import { capitalize } from "lodash";
import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import security from "server/core/security";
import { markdown } from "server/core/templating-filters";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import * as userMacros from "server/user/user.macros";

export default function render(context: CommonLocals) {
  const { user, event, eventParticipations, currentlyLiveUserIds, streamerOnlyTournamentIsLive } = context;

  registerStyles(context);

  userMacros.registerTwitchEmbedScripts(context);

  return base(context,
    <div>
      <div class="background">
        <div class="event-banner__gradient"></div>
        <div class="container text-center">
          <h1>
            <div>{event.get("title")} streamers</div>
            <a href={links.routeUrl(event, "event", "streamers-doc")} class="btn btn-primary mx-1">Learn more</a>
            {ifTrue(streamerOnlyTournamentIsLive, () =>
              <a href={links.routeUrl(event, "event", "tournament-leaderboard")} class="btn btn-primary">Browse tournament leaderboard</a>
            )}
          </h1>

          <div class="row d-flex justify-content-center text-left">
            {eventParticipations.map(eventParticipation =>
              <div class="col-lg-4 col-md-6">
                <a name={eventParticipation.userId}></a>
                <div class="card mb-4 {eventParticipation.streamerStatus}">
                  <div class="card-header" dangerouslySetInnerHTML={userMacros.userThumb(eventParticipation.user, { fullWidth: true })}></div>

                  {ifTrue(currentlyLiveUserIds.includes(eventParticipation.userId), () =>
                    userMacros.twitchEmbed(eventParticipation.user.details.social_links.twitch, { height: 200 })
                  )}
                  {ifFalse(currentlyLiveUserIds.includes(eventParticipation.userId), () =>
                    <div class="card-body">
                      <div class="mb-2">{userMacros.twitchLink(eventParticipation.user)}</div>
                      {ifTrue(eventParticipation.streamerDescription.trim(), () =>
                        <div dangerouslySetInnerHTML={markdown(eventParticipation.streamerDescription)} />
                      )}
                      {ifFalse(eventParticipation.streamerDescription.trim(), () =>
                        <p class="text-center"><i>Stream schedule unknown</i></p>
                      )}
                    </div>
                  )}

                  {ifTrue(security.isMod(user), () =>
                    <form class="card-footer bg-moderation" method="post" onsubmit="return confirm('Confirm streamer status change?')">
                      {context.csrfTokenJSX()}
                      <input type="hidden" name="targetUserId" value={eventParticipation.user.id} />
                      <span class="fas fa-wrench"></span>
                      Status <span class="badge badge-secondary">{capitalize(eventParticipation.streamerStatus)}</span>
                      <div class="float-right">
                        {ifTrue(eventParticipation.streamerStatus === "requested", () =>
                          <button name="approve" class="btn btn-success btn-sm">Approve</button>
                        )}
                        {ifTrue(eventParticipation.streamerStatus !== "requested", () =>
                          <button name="reset" class="btn btn-secondary btn-sm">Reset</button>
                        )}
                        {ifTrue(eventParticipation.streamerStatus === "requested", () =>
                          <button name="ban" class="btn btn-danger btn-sm ml-1">Ban</button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {ifTrue(eventParticipations.length === 0, () =>
              <div class="tv-no-signal">
                <h1>NO SIGNAL</h1>
                <h3>Waiting for the first streamer to join :)</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>);
}


function registerStyles(context) {
  context.inlineStyles.push(`
    .background {
      background: url('${links.staticUrl("/static/images/streamer-background.jpg")}');
      background-size: cover;
      background-repeat: no-repeat;
      background-position-x: center;
      margin-top: -20px;
      padding-top: 100px;
      min-height: 1024px;
    }
    
    h1 {
      text-align: center;
      color: #EEE !important;
    }
    .flex-1 {
      flex: 1;
    }
    .card.banned {
      opacity: .5;
    }
    .card-header {
      margin-left: -15px;
    }
    .card-body {
      height: 200px;
      overflow-y: auto;
    }
    .event-banner__gradient {
      margin-top: 60px;
      pointer-events: none;
    }
    .tv-no-signal {
      margin-top: 50px;
    }
    .tv-no-signal h1, .tv-no-signal h3 {
      font-weight: bold;
      font-family: 'Courier New', Courier, monospace;
      text-align: center;
      color: #DDD;
      max-width: 350px;
    }
    `);
}
