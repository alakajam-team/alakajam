import { truncate } from "lodash";
import * as React from "preact";
import { JSX } from "preact";
import { moderationBar } from "server/admin/components/moderation-bar.component";
import { CommonLocals } from "./common.middleware";
import links from "./core/links";
import { ifFalse, ifNotSet, ifSet, ifTrue } from "./macros/jsx-utils";
import { BookshelfModel } from "bookshelf";

export default function base(context: CommonLocals, contents: JSX.Element) {
  const { pageImage, launchTime, rootUrl, path, event, user, unreadNotifications } = context;

  const pageTitle = (context.pageTitle ? (context.pageTitle + " | ") : "") + "Alakajam!";
  const pageDescription = context.pageDescription || "A community for game development enthusiasts, organizing regular events && competitions.";
  const inEvent = event && event.get("id");

  return <html lang="en">
    <head>

      <title>{pageTitle}</title>

      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content="@AlakajamBang" />
      <meta name="twitter:title" content={pageTitle ? pageTitle : "Alakajam!"} />
      <meta name="twitter:description" content={truncate(pageDescription, { length: 160 })} />
      <meta name="twitter:image" content={pageImage || links.staticUrl("/static/images/logo.png")} />
      <meta property="og:title" content={pageTitle ? pageTitle : "Alakajam!"} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={rootUrl + path} />
      <meta property="og:image" content={pageImage || links.staticUrl("/static/images/logo.png")} />
      <meta name="description" content={truncate(pageDescription, { length: 160 })} />

      <link rel="icon" type="image/png" href={links.staticUrl("/static/images/favicon16.png")} sizes="16x16" />
      <link rel="icon" type="image/png" href={links.staticUrl("/static/images/favicon32.png")} sizes="32x32" />
      <link rel="icon" type="image/png" href={links.staticUrl("/static/images/favicon196.png")} sizes="196x196" />
      <link href="https://fonts.googleapis.com/css?family=Fredoka+One" rel="stylesheet" />
      <style type="text/css">{context.inlineStyles.join("\n")}</style>
      <link rel="stylesheet" type="text/css" href={links.staticUrl("/dist/client/css/index.css?" + launchTime)} />
      <script id="js-alerts" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(context.alerts) }} />
    </head>

    <body>

      {/* ==== Main header ==== */}

      <nav id="main-header" class={"navbar navbar-dark bg-primary navbar-expand-md " + (inEvent ? "has-event-navbar" : "")}>
        <div class="container justify-content-between">
          <a class="navbar-brand" href="/"><div class="navbar-brand__hover"></div></a>

          <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbar-dropdown"
            aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>

          <div class="collapse navbar-collapse" id="navbar-dropdown">
            <ul class="navbar-nav">
              <li class={"nav-item " + (path === "/events" ? "active" : "")}><a class="nav-link" href="/events">Events</a></li>
              <li class={"nav-item " + (path.startsWith("/games") ? "active" : "")}><a class="nav-link" href="/games">Games</a></li>
              <li class={"nav-item " + (path.startsWith("/people") ? "active" : "")}><a class="nav-link" href="/people">People</a></li>
              <li class={"nav-item d-none d-sm-block " + (path === "/chat" ? "active" : "")}><a class="nav-link" href="/chat">Chat</a></li>
              <li class={"nav-item " + ((path.startsWith("/article/docs") || path.startsWith("/api")) ? "active" : "")}>
                <a class="nav-link" href="/article/docs">Docs</a></li>
              <li class={"nav-item " + ((path.startsWith("/article/about") || path === "/changes") ? "active" : "")}>
                <a class="nav-link" href="/article/about">About</a></li>
              {ifSet(user, () =>
                <>
                  <li class={"nav-item d-md-none " + (path.startsWith("/dashboard") ? "active" : "")}>
                    <a class="nav-link" href="/dashboard">Dashboard</a></li>
                  <li class={"nav-item d-md-none " + (path === "/logout" ? "active" : "")}><a class="nav-link" href="/logout">Logout</a></li>
                  <li class="nav-item button-item d-none d-md-block">
                    {userMenu(user, unreadNotifications)}
                  </li>
                </>
              )}
              {ifNotSet(user, () =>
                <>
                  <li class="nav-item button-item">
                    <a class="nav-link" href={"/login" + (path.startsWith("/log") ? "" : ("?redirect=" + encodeURIComponent(path)))}>
                      <button class="btn btn-outline-light">Login</button>
                    </a>
                  </li>
                  <li class="nav-item button-item">
                    <a class="nav-link" href="/register">
                      <button class="btn btn-outline-light">Register</button>
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>


      {/* ==== Event header ==== */}

      {ifTrue(inEvent, () => {
        const eventHomePath = links.routeUrl(event, "event");
        const statusJam = event.get("status_entry");
        const statusTournament = event.get("status_tournament");

        return <nav class="event-navbar navbar navbar-light navbar-expand-md justify-content-between">
          <div class="container">
            <div class="event-navbar__info">
              <button class="navbar-toggler" type="button" data-toggle="collapse"
                data-target="#navbar-event-dropdown" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle event navigation">
                <i class="fas fa-caret-down"></i>
              </button>

              <a href={eventHomePath} class={"event-navbar__link home " + (path && path === eventHomePath ? "active" : "")}>
                <span class="fa fa-home"></span>
                <span>
                  <span class="event-navbar__name">
                    {event.get("title")}
                  </span>
                  <span class="event-navbar__dates">
                    {event.get("display_dates")}
                  </span>
                </span>
              </a>
            </div>

            <div class="collapse navbar-collapse" id="navbar-event-dropdown">
              <ul class="navbar-nav">
                {ifTrue(statusJam !== "disabled", () =>
                  <>
                    {eventLink(event, null, "dashboard", "Dashboard", "play-circle", path)}
                    <li class="mx-3 my-2" style="border-left: solid 1px"></li>
                  </>
                )}
                {ifFalse(event.related("details").get("flags")?.hideStreamerMenu, () =>
                  eventLink(event, null, "streamers", "Streamers", "tv", path)
                )}

                {ifTrue(statusJam && statusJam !== "disabled", () =>
                  <>
                    {eventLink(event, "status_theme", "themes", "Themes", "lightbulb", path)}
                    {eventLink(event, "status_entry", "games",
                      <>Games {ifTrue(event.get("entry_count"), () => <span class='count'>({event.get("entry_count")})</span>)}</>,
                      "gamepad", path)}
                    {eventLink(event, "status_results", "results", "Results", "th-list", path, { requiredValue: ["results"] })}
                  </>
                )}

                {ifTrue(statusTournament && statusTournament !== "disabled", () =>
                  <>
                    {ifTrue(statusJam && statusJam !== "disabled", () =>
                      <li class="mx-3 my-2" style="border-left: solid 1px"></li>
                    )}
                    {eventLink(event, "status_tournament", "tournament-games",
                      "Tournament", "gamepad", path, { requiredValue: ["playing", "closed", "results"] })}
                    {eventLink(event, "status_tournament", "tournament-leaderboard",
                      "Leaderboard", "th-list", path, { requiredValue: ["playing", "closed", "results"] })}
                  </>
                )}
              </ul>
            </div>
          </div>
        </nav>;
      })}


      {/* ==== Mod header ==== */}

      {ifTrue(user && (user.get("is_mod") || user.get("is_admin")), () =>
        moderationBar(context, user.get("is_admin"))
      )}


      {/* ==== Body ==== */}

      <div class="body">
        {contents}
      </div>


      {/* ==== Footer ==== */}

      <footer class="footer">
        <div class="container p-4">
          <div class="row">
            <div class="col-12 col-lg-6">
              <a href="https://twitter.com/AlakajamBang" class="footer__link">
                <img src={links.staticUrl("/static/images/social/black-twitter.svg")} class="footer__icon no-border" />
                <strong>@AlakajamBang</strong>
              </a>
              <a href="/post/1070/finances-of-the-alakajam-association" class="footer__link">
                <img src={links.staticUrl("/static/images/social/black-paypal.svg")} class="footer__icon no-border" />
                <strong>Donate</strong>
              </a>
              <a href="/chat" class="footer__link">
                <img src={links.staticUrl("/static/images/social/black-irc.svg")} class="footer__icon no-border" />
              </a>
              <a href="https://discord.gg/yZPBpTn" class="footer__link">
                <img src={links.staticUrl("/static/images/social/black-discord.svg")} class="footer__icon no-border" />
              </a>
              <a href="https://www.reddit.com/r/alakajam/" class="footer__link">
                <img src={links.staticUrl("/static/images/social/black-reddit.svg")} class="footer__icon no-border" />
              </a>
              <a href="https://github.com/alakajam-team" class="footer__link">
                <img src={links.staticUrl("/static/images/social/black-github.svg")} class="footer__icon no-border" />
              </a>
            </div>
            <div class="col-12 col-lg-6 text-lg-right">
              <p class="m-1">
                Made with love by the <a href="https://github.com/alakajam-team/alakajam/graphs/contributors">Alakajam! contributors</a>&nbsp;
                | <a href="/article/about/privacy-policy">Privacy Policy</a>  | <a href="/article/about">Contact</a>
              </p>
              {ifTrue(context.devMode, () =>
                <p>
                  <span class="badge badge-light" data-toggle="tooltip" data-placement="top"
                    title="Set `NODE_ENV=production` in production for security && performance">Server launched in development mode</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </footer>

      {ifSet(process.env.BROWSER_REFRESH_URL, () => <script src={process.env.BROWSER_REFRESH_URL}></script>)}
      <script type="text/javascript" src={links.staticUrl("/dist/client/scripts/vendors.js?" + launchTime)}></script>
      <script type="text/javascript" src={links.staticUrl("/dist/client/scripts/site.js?" + launchTime)}></script>

      {/* TODO #398 migrate to vendors.js */}
      <script type="text/javascript" src={links.staticUrl("/static/scripts/popper.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/bootstrap.bundle.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/bootstrap-notify.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/icheck.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/select2.full.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/flipclock.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/lodash.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/tablesort-number-date.min.js")}></script>
      <script type="text/javascript" src={links.staticUrl("/static/scripts/chartist.min.js")}></script>

      {/* TODO #398 migrate codemirror/tinymce related sources to separate entrypoints */}
      {context.scripts.map(scriptUrl => <script type="text/javascript" src={scriptUrl}></script>)}
    </body>
  </html>;
}


function userMenu(user, unreadNotifications) {
  return <div class="dropdown">
    <button class="btn btn-outline-light dropdown-toggle" type="button" id="dropdownMenuButton"
      data-toggle="collapse" data-target="#navbar-user-dropdown" aria-haspopup="true" aria-expanded="false">
      <a class="navbar-avatar-wrapper" href={links.routeUrl(user, "user", "feed")} onclick="arguments[0].stopPropagation()">
        {ifSet(user.get("avatar"), () =>
          <img src={links.pictureUrl(user.get("avatar"), user)} class="navbar-avatar" />
        )}
        {ifNotSet(user.get("avatar"), () =>
          <img src={links.staticUrl("/static/images/default-avatar.png")} class="navbar-avatar" />
        )}
        <div class={"navbar-unread-notifications " + (unreadNotifications > 0 ? "unread" : "")}>
          {unreadNotifications}
        </div>
      </a>
      {user.get("title")}
    </button>
    <div class="dropdown-menu dropdown-menu-right" id="navbar-user-dropdown">
      <a class="dropdown-item" href={links.routeUrl(user, "user", "feed")}>Dashboard</a>
      <a class="dropdown-item" href={links.routeUrl(user, "user")}>Public profile</a>
      <a class="dropdown-item" href={links.routeUrl(user, "user", "settings")}>Settings</a>
      <div class="dropdown-divider"></div>
      <a class="dropdown-item" href={links.routeUrl(user, "user", "entries")}>My entries</a>
      <a class="dropdown-item" href={links.routeUrl(user, "user", "posts")}>My posts</a>
      <a class="dropdown-item" href={links.routeUrl(user, "user", "scores")}>My scores</a>
      <div class="dropdown-divider"></div>
      <a class="dropdown-item" href="/logout">Logout</a>
    </div>
  </div>;
}

function eventLink(
  event: BookshelfModel,
  statusField: string,
  targetPath: string,
  label: string | JSX.Element,
  icon: string,
  currentPath: string,
  options: { requiredValue?: string[] } = {}) {

  if (!statusField || event.get(statusField) !== "disabled") {
    const targetUrl = targetPath.includes("/") ? targetPath : links.routeUrl(event, "event", targetPath);
    return <li class="nav-item">
      <a href={targetUrl} class={"nav-link event-navbar__link "
        + (currentPath && currentPath.startsWith(targetUrl) ? "active" : "")
        + (statusField && (!(parseInt(event.get(statusField), 10)))
          && (event.get(statusField) === "off" || options.requiredValue
            && !options.requiredValue.includes(event.get(statusField))) ? "disabled" : "")}>
        <span class={`fas fa-${icon}`}></span>&nbsp;
        <span>{label}</span>
      </a>
    </li>;
  }
}
