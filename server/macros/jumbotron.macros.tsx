import { BookshelfModel, EntryBookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import { dateTime, featuredEventDateTime, markdown, relativeTime, timezone } from "server/core/templating-filters";
import { EventParticipation } from "server/entity/event-participation.entity";
import { User } from "server/entity/user.entity";
import * as eventMacros from "server/event/event.macros";
import * as tournamentMacros from "server/event/tournament/tournament.macros";
import * as postMacros from "server/post/post.macros";
import { ifFalse, ifSet, ifTrue } from "./jsx-utils";


export function eventJumbotron(event: BookshelfModel, eventParticipation: EventParticipation, featuredPost: BookshelfModel,
  user: User, userLikes: unknown[], entry: EntryBookshelfModel, tournamentScore: BookshelfModel, path: string,
  options: { inviteToJoin?: boolean } = {}): JSX.Element {
  const isTournament = !["disabled", "off"].includes(event.get("status_tournament"));

  return <div class="event-jumbotron" style={backgroundImage(event)}>
    <div class="container">
      <div class="row">
        <div class="col-xl-9">
          <div class="row">
            <div class="col-lg-4 event-jumbotron__logo-container">
              {eventJumbotronAvatar(event, path)}
            </div>

            <div class="col-lg-8 mb-3 mb-lg-0 align-self-center">
              {eventJumbotronCountdown(event, user)}
              {eventJumbotronPost(featuredPost, user, userLikes)}
            </div>
          </div>
        </div>

        <div class="col-xl-3">
          <div class="row">
            {ifTrue(isTournament, () =>
              <div class="col-xl-12 col-sm-6 mb-3">
                <div class="card bg-jumbotron border-0">
                  {ifFalse(options.inviteToJoin, () => {
                    if (entry) {
                      return <a class="card-header shortcut" href={links.routeUrl(event, "event", "dashboard")}>
                        <h4 class="mb-0">
                          <span class="shortcut__icon"><span class="fas fa-gamepad"></span></span>
                          <span class="shortcut__title">My participation</span>
                        </h4>
                      </a>;
                    } else {
                      return <a class="card-header shortcut" href={links.routeUrl(event, "event", "tournament-leaderboard")}>
                        <h4 class="mb-0">
                          <span class="shortcut__icon"><span class="fas fa-gamepad"></span></span>
                          <span class="shortcut__title">Tournament</span>
                        </h4>
                      </a>;
                    }
                  })}
                  {tournamentJumbotronContent(user, event, eventParticipation, tournamentScore, entry, options)}
                </div>
              </div>
            )}

            {ifFalse(isTournament, () =>
              <>
                <div class="col-xl-12 col-sm-6 mb-3">
                  <div class="card bg-jumbotron border-0">
                    {ifFalse(options.inviteToJoin, () =>
                      <a class="card-header shortcut" href={links.routeUrl(event, "event", "dashboard")}>
                        <h4 class="mb-0">
                          <span class="shortcut__icon"><span class="fas fa-gamepad"></span></span>
                          <span class="shortcut__title">My entry</span>
                        </h4>
                      </a>
                    )}
                    {myEntryJumbotronContent(event, entry, eventParticipation, options)}
                  </div>
                </div>
                <div class="col-xl-12 col-sm-6 mb">
                  <div class="card border-0 bg-jumbotron event-jumbotron__stats">
                    <div class="card-header shortcut py-1">
                      <span class="shortcut__icon"><span class="fas fa-chart-line"></span></span>
                      <span class="shortcut__title">Stats</span>
                    </div>
                    <div class="text-center">
                      {statsCounters(event)}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  </div>;
}

function eventJumbotronAvatar(event: BookshelfModel, path: string) {
  const eventHome = links.routeUrl(event, "event");
  const eventLogo = event.get("logo");
  const AvatarTag = (path.startsWith(eventHome)) ? "div" : "a";
  return <AvatarTag href={eventHome} class="event-jumbotron__logo">
    <img src={eventLogo ? links.pictureUrl(eventLogo, event) : links.staticUrl("/static/images/favicon196.png")} />
  </AvatarTag>;
}

function eventJumbotronCountdown(event, user) {
  if (event.get("countdown_config")?.message || event.get("countdown_config")?.phrase) {
    const rawHypeLink = event.get("countdown_config").link;
    const hypeLink = (rawHypeLink && rawHypeLink.indexOf("/") !== -1) ? rawHypeLink : links.routeUrl(event, "event", rawHypeLink);
    const animatedCountdownEnabled = event.get("countdown_config").enabled;
    return <div class="card card-body jumbotron-invite"
      onclick={hypeLink ? ("window.location = '" + hypeLink + "'") : ""}>
      <div class="row align-items-center">
        <div class={"col-12 " + (animatedCountdownEnabled ? "col-lg-6 mb-3 mb-xl-0" : "")}>
          <h1 class="jumbotron-invite__title">{event.get("countdown_config").message}</h1>
          <div class="jumbotron-invite__details">
            {eventJumbotronCountdownPhrase(event, user)}
          </div>
        </div>
        {ifTrue(animatedCountdownEnabled, () =>
          <div class="col-xl-6 d-none d-sm-block">
            <div class="jumbotron-invite__countdown js-countdown" data-countdown-to-date={event.get("countdown_config").date}></div>
          </div>
        )}
      </div>
    </div>;
  }
}

function eventJumbotronPost(featuredPost, user, userLikes) {
  if (featuredPost) {
    const isEmbedPost = featuredPost.get("body").indexOf("&lt;iframe") === 0;
    return <div class="event-jumbotron__post">
      {ifTrue(isEmbedPost, () =>
        <>
          {postMacros.post(featuredPost, { hideBody: true, hideDetails: true, readingUser: user, readingUserLikes: userLikes })}
          <jsx-wrapper dangerouslySetInnerHTML={markdown(featuredPost.get("body"))} />
        </>
      )}
      {ifFalse(isEmbedPost, () =>
        <div class="card">
          {postMacros.post(featuredPost, { hideBody: true, hideDetails: true, readingUser: user, readingUserLikes: userLikes })}
          <div class="event-jumbotron__post-details">
            <span data-toggle="tooltip" title={dateTime(featuredPost.get("published_at"), user)}>
              {relativeTime(featuredPost.get("published_at"))}
            </span>
          </div>
        </div>
      )}
    </div>;
  }
}

export function myEntryJumbotronContent(event: BookshelfModel, entry: EntryBookshelfModel, eventParticipation: EventParticipation,
  options: { inviteToJoin?: boolean } = {}, isTournament?: boolean): JSX.Element {
  const votingEnabled = ["voting", "voting_rescue"].includes(event.get("status_results"));
  if (entry) {
    if (votingEnabled) {
      return <div class="card-body text-center p-2">
        {eventMacros.entrySmallThumb(entry)}
        <a href={links.routeUrl(event, "event", "dashboard")} class="btn btn-alt d-block mt-2">Event dashboard</a>
        <a href={links.routeUrl(event, "event", "games")} class="btn btn-alt d-block mt-2">Rate games</a>
      </div>;
    } else if (!isTournament) {
      return <>
        {eventMacros.entrySmallThumb(entry)}
        <div class="card-body text-center p-0">
          <a href={links.routeUrl(event, "event", "dashboard")} class="btn btn-alt d-block">Event dashboard</a>
        </div>
      </>;
    } else {
      return <div class="card-body text-center p-2">
        {eventMacros.entrySmallThumb(entry)}
        <a href={links.routeUrl(event, "event", "dashboard")} class="btn btn-alt d-block mt-2">Event dashboard</a>
      </div>;
    }
  } else {
    const entryCreationEnabled = ["open", "open_unranked"].includes(event.get("status_entry"));
    const isStreamer = ["requested", "approved"].includes(eventParticipation?.streamerStatus);
    return <div class="card-body text-center p-2">
      {ifTrue(options.inviteToJoin, () =>
        <a href={links.routeUrl(event, "event", "join")} class="btn btn-alt btn-lg d-block py-4">Join the event</a>
      )}
      {ifFalse(options.inviteToJoin, () => {
        return <>
          {ifTrue(entryCreationEnabled, () =>
            <>
              <p class="mb-1">Submissions are open</p>
              <a href={links.routeUrl(event, "event", "create-entry")} class="btn btn-alt btn-lg d-block mb-2">Submit entry</a>
            </>
          )}
          {ifTrue(!entryCreationEnabled && event.get("status_entry") === "closed", () =>
            "Submissions are closed."
          )}
          {ifTrue(!entryCreationEnabled && event.get("status_entry") !== "closed", () =>
            "Submissions are not open yet."
          )}
          {ifTrue(votingEnabled && isStreamer, () =>
            <a href={links.routeUrl(event, "event", "games")} class="btn btn-alt d-block mt-2">Rate games</a>
          )}
          <a href={links.routeUrl(event, "event", "dashboard")} class="btn btn-alt d-block mt-2">Event dashboard</a>
        </>;
      })}
    </div>;
  }
}

export function tournamentJumbotronContent(user: User, event: BookshelfModel, eventParticipation: EventParticipation,
  tournamentScore: BookshelfModel, entry: EntryBookshelfModel, options: { inviteToJoin?: boolean } = {}): JSX.Element {
  const leaderboard = ["closed", "results"].includes(event.get("status_tournament"));
  return <>
    {ifSet(entry, () =>
      myEntryJumbotronContent(event, entry, eventParticipation, options, true)
    )}
    <div class={`card-body text-center ${entry ? "px-2 pt-0 pb-2" : "p-2"}`}>
      {tournamentMacros.userRanking(user, event, eventParticipation, tournamentScore, { compact: true })}
      {ifTrue(leaderboard, () =>
        <a href={links.routeUrl(event, "event", "tournament-leaderboard")} class="btn btn-alt d-block">Leaderboard</a>
      )}
      {ifFalse(leaderboard, () =>
        <a href={links.routeUrl(event, "event", "tournament-games")} class="btn btn-alt d-block">Play games</a>
      )}
    </div>
  </>;
}

export function statsCounters(event: BookshelfModel): JSX.Element {
  const participants = event.related<BookshelfModel>("details").get("participation_count");
  const statsElements = [];

  statsElements.push(<a href={`/events/people?search=&eventId=${event.get("id")}`} class="d-block">
    <span class="event-jumbotron__stats-counter">{participants}</span>&nbsp;
    entrant{participants !== 1 ? "s" : ""}
  </a>);

  if (event.get("status_entry") !== "off") {
    const entries = event.get("entry_count");
    statsElements.push(
      <a href={links.routeUrl(event, "event", "games")} class="d-block">
        <span class="event-jumbotron__stats-counter">{entries}</span>&nbsp;
        entr{entries !== 1 ? "ies" : "y"}
        {!entries ? "... for now!" : ""}
      </a>);
  } else if (event.get("status_theme") === "voting") {
    const themes = event.related("details").get("theme_count") || "0";
    statsElements.push(
      <a href={links.routeUrl(event, "event", "themes")} class="d-block">
        <span class="event-jumbotron__stats-counter">{themes}</span>&nbsp;
        theme{themes !== 1 ? "s" : ""}
        {!themes ? "... for now!" : ""}
      </a>);
  } else if (["shortlist", "closed", "results"].includes(event.get("status_theme"))) {
    const themeVotes = event.related("details").get("theme_vote_count") || "0";
    statsElements.push(
      <a href={links.routeUrl(event, "event", "themes")} class="d-block">
        <span class="event-jumbotron__stats-counter">{themeVotes}</span>&nbsp;
        theme vote{themeVotes !== 1 ? "s" : ""}
      </a>);
  }

  return <div class="event-jumbotron__stats-contents py-2">
    {statsElements}
  </div >;
}

export function eventJumbotronCountdownPhrase(event: BookshelfModel, user: User): JSX.Element {
  if (event.get("countdown_config").phrase) {
    return <>
      <div class="jumbotron-invite__phrase">
        {event.get("countdown_config").phrase}&nbsp;
        {featuredEventDateTime(event.get("countdown_config").date, user)}
      </div>
      {ifTrue(user && event.get("countdown_config").date, () =>
        <div class="jumbotron-invite__timezone">
          Times for {(user && user.get("timezone")) ? timezone(user.get("timezone")) : "Unknown timezone"}
          <a href={links.routeUrl(user, "user", "settings")} class="btn btn-outline-light btn-xs border-0">
            <span class="fa fa-cog"></span>
          </a>
        </div>
      )}
    </>;
  }
}

export function backgroundImage(event: BookshelfModel): string {
  const eventImagePath = event?.related("details").get("background") || event?.related("details").get("banner");
  const url = eventImagePath ? links.pictureUrl(eventImagePath, event) : links.staticUrl("/static/images/default-background.png");
  return `background-image: url('${url}');`;
}
