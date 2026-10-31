import React, { JSX } from "preact";
import base from "server/base.template";
import links from "server/core/links";
import * as carouselMacros from "server/macros/carousel.macros";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as jumbotronMacros from "server/macros/jumbotron.macros";
import * as postMacros from "server/post/post.macros";
import * as userMacros from "server/user/user.macros";
import { HomeContext } from "./home.controller";

export default function render(context: HomeContext): JSX.Element {
  const { user, featuredEvent, featuredPost, embedStreamer, jumboStream, featuredEventAnnouncement, path,
    eventsTimeline, eventParticipation, inviteToJoin, entry, tournamentScore,
    suggestedEntries, posts, comments, userPost, userLikes } = context;

  userMacros.registerTwitchEmbedScripts(context);

  return base(context,
    <div>
      {/* ===== WELCOME BANNER ===== */}

      {ifNotSet(user, () =>
        <div class="home-welcome">
          <div class="home-welcome__container container">
            <img class="home-welcome__icon" src={links.staticUrl("/static/images/welcome.png")} />
            <div>
              <div class="home-welcome__title">New website unlocked</div>
              Welcome to <span class="home-welcome__brand">Alakajam!</span>, a game making community. We host informal game jams!
              <a class="home-welcome__more ml-1" href="/article/about">Learn&nbsp;more...</a>
            </div>
          </div>
        </div>
      )}

      {/* ===== JUMBO STREAM ===== */}

      {ifSet(jumboStream, () =>
        <div class="home-stream-container">
          <div class="container my-2">
            {userMacros.twitchEmbed(jumboStream, { autoplay: true, height: 500 })}
          </div>
        </div>
      )}

      {/* ===== EVENT JUMBOTRON ===== */}

      {ifSet(featuredPost, () =>
        <div class="home-welcome home-welcome--post pt-3" style={!featuredEvent && { marginBottom: 0 }}>
          <div class="container">{postMacros.post(featuredPost, { readOnly: true })}</div>
        </div>
      )}
      {ifSet(featuredEvent, () =>
        jumbotronMacros.eventJumbotron(featuredEvent, eventParticipation, featuredEventAnnouncement, user, userLikes,
          entry, tournamentScore, path, { inviteToJoin })
      )}
      {!featuredEvent && !featuredPost &&
        <div class="event-jumbotron" style={jumbotronMacros.backgroundImage(featuredEvent)}>
          <div class="container">
            {ifNotSet(featuredPost, () =>
              <h1 class="card card-body text-center">Next event not announced yet.</h1>
            )}
          </div>
        </div>}

      {/* ===== EVENTS TIMELINE NAVBAR ===== */}

      <div class="home-navbar">
        <div class="container">
          <div class="row">
            <div class="col-sm-9 col-3">
              <div class="home-navbar__events">
                <a class="home-navbar__events-home btn btn-outline-light border-0" href="/explore/events">
                  <span class="fa fa-calendar-alt"></span>
                  <span class="d-none d-sm-inline">Events<br />timeline</span>
                </a>
                {(eventsTimeline || []).map((event, index) =>
                  <a class={"home-navbar-event d-sm-inline-flex d-none btn "
                      + (featuredEvent && event.get("id") === featuredEvent.get("id") ? "btn-secondary " : "btn-outline-light border-0 ")
                      + (index === 0 ? "d-none d-lg-inline-block" : "")}
                  href={links.routeUrl(event, "event")}>
                    <div class="home-navbar-event__legend">
                      <div>
                        {event.get("title")}
                        {ifTrue(event.get("title").includes("Alakajam"), () =>
                          <img src={links.staticUrl("/static/images/favicon16.png")} class="no-border" />
                        )}
                      </div>
                      <div class="home-navbar-event__dates">{event.get("display_dates")}</div>
                    </div>
                  </a>
                )}
              </div>
            </div>
            <div class="col-sm-3 col-9">
              <div class="home-navbar__social">
                {socialLink("Mastodon", "https://mastodon.gamedev.place/@alakajam", "mastodon.svg")}
                {socialLink("Discord", "https://discord.gg/yZPBpTn", "discord.svg")}
                {socialLink("IRC", "/chat", "irc.svg")}
                {socialLink("Twitter", "https://twitter.com/AlakajamBang", "twitter.svg")}
                {socialLink("Reddit", "https://www.reddit.com/r/alakajam", "reddit.svg")}
                {socialLink("Github", "https://github.com/alakajam-team", "github.svg")}
                <a href="/post/1070/finances-of-the-alakajam-association" class="btn btn-secondary">
                  <span class="fas fa-donate"></span>
                  Donate
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="container">
        {/* ===== FEATURED STREAMER ===== */}

        {ifTrue(featuredEvent && featuredEvent.get("status") === "open" && embedStreamer && !jumboStream, () =>
          <div>
            <div class="horizontal-bar">Featured streamer</div>
            <div class="featured p-0 mb-1">
              {userMacros.twitchEmbed(embedStreamer.details.social_links.twitch, { height: 250 })}
              <div class="my-1">
                {userMacros.userThumb(embedStreamer)}
                <a href={links.routeUrl(featuredEvent, "event", "streamers")} class="mx-3">
                  <span class="fa fa-tv"></span> Browse all streamers
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ===== GAME RATING SUGGESTIONS ===== */}

        {ifTrue(user && suggestedEntries && suggestedEntries.length > 0, () =>
          <div>
            <div class="horizontal-bar">
              Suggested entries to play
              {formMacros.tooltip("Rate and comment other games to increase your karma. The Top 3 are featured on the front page!")}
            </div>
            <div class="home-grid game-grid pb-1">
              {suggestedEntries.map(suggestedEntry =>
                <div class="game-grid-entry">
                  {eventMacros.entryThumb(suggestedEntry)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== LATEST BLOG POSTS ===== */}

        {carouselMacros.carousel(
          (posts || []).map(post => postMacros.postCard(post, { readingUser: user, readingUserLikes: userLikes })),
          {
            id: "posts",
            title: "Latest posts",
            titleHref: "/posts",
            headerActions: user && featuredEvent
              ? eventMacros.eventShortcutMyPost(user as any, featuredEvent, userPost, { buttonsOnly: true })
              : undefined
          })}

        {/* ===== LATEST COMMENTS ===== */}

        {carouselMacros.carousel(
          (comments || []).map(comment => postMacros.commentCard(comment as any, { readingUser: user })),
          { id: "comments", title: "Latest comments" })}
      </div>
    </div>);
}

function socialLink(title, url, iconName) {
  return <a href={url} data-toggle="tooltip" title={title}>
    <img src={links.staticUrl("/static/images/social/" + iconName)} class="footer__icon no-border" />
  </a>;
}
