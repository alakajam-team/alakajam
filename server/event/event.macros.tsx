import { BookshelfModel, EntryBookshelfModel } from "bookshelf";
import { capitalize, range, truncate } from "lodash";
import * as React from "preact";
import constants from "server/core/constants";
import links from "server/core/links";
import { digits } from "server/core/templating-filters";
import { ifFalse, ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";

export function entryThumb(entry: EntryBookshelfModel, options: {
  hideMedals?: boolean;
  showEvent?: boolean;
  showKarma?: boolean;
} = {}) {
  const picturePath = entry.pictureThumbnail();
  const authors = entry.sortedUserRoles();

  return <div class="entry-thumb">
    <a href={links.routeUrl(entry, "entry")}>
      {ifTrue(entry.get("description"), () =>
        <div class="entry-thumb__description-container">
          <div class="entry-thumb__description">{entry.get("description")}</div>
        </div>
      )}
      <div class="entry-thumb__picture js-lazy"
        data-src={picturePath ? links.pictureUrl(picturePath, entry) : links.staticUrl("/static/images/default-entry.png")}>
        {ifFalse(options.hideMedals, () => {
          const details = entry.related("details");
          return <div class="entry-medals">
            {ifSet(details, () =>
              range(1, 8).map(categoryIndex => {
                const ranking = details.get("ranking_" + categoryIndex);
                if (ranking && ranking <= 3) {
                  return <span class={`entry-results__category-medal medal-category-${categoryIndex} medal-ranking-${ranking} in-picture`}></span>;
                }
              })
            )}
          </div>;
        })}
        <div class="entry-thumb__picture-gradient"></div>
      </div>
      <div class="entry-thumb__title">{entry.get("title")}</div>
    </a>
    <div class="entry-thumb__author" >by&nbsp;
      {authors.map((userRole, index) =>
        <>
          <a href={links.routeUrl(userRole, "user")}>
            {userRole.get("user_title")}
          </a>
          {index < authors.length - 1 ? ", " : ""}
        </>
      )}
    </div>
    <div class="entry-thumb__footer">
      {ifTrue(options.showEvent, () =>
        <div class="entry-thumb__event">
          {ifTrue(entry.get("event_id"), () =>
            <>
              on <a href={links.routeUrl(entry.related<BookshelfModel>("event"), "event")}>{entry.related("event").get("title")}</a>
            </>
          )}
          {ifTrue(entry.get("external_event") && !entry.get("event_id"), () =>
            <>
              on {truncate(entry.get("external_event"), { length: 32 })}
            </>
          )}
        </div>
      )}
      <div class="entry-thumb__icons">
        {ifTrue(options.showKarma, () =>
          <span class="entry-thumb__karma" data-toggle="tooltip"
            title="Rate && review other games to increase your karma, && get featured higher on the list!">
            Karma: {digits(entry.get("karma"), 0)}
          </span>
        )}
        {entry.get("platforms")?.map(platform =>
          entryPlatformIcon(platform, { hideLabel: true })
        )}
        <span class="badge badge-secondary badge-sm ml-1">{capitalize(entry.get("division"))}</span>
      </div>
    </div>
  </div>;
}

export function entrySmallThumb(entry: EntryBookshelfModel, options: { noShadow?: boolean; customMessage?: string } = {}) {
  return <div class="entry-small-thumb" style={options.noShadow ? "box-shadow: none" : ""}>
    {ifTrue(entry && entry.get("id"), () => {
      const authors = entry.sortedUserRoles();
      const customPicturePath = entry.pictureIcon();
      const picturePath = customPicturePath
        ? links.pictureUrl(customPicturePath, entry)
        : links.staticUrl("/static/images/default-entry.png");
      return <div class="entry-small-thumb__details">
        <a href={links.routeUrl(entry, "entry")}>
          <div class="entry-small-thumb__picture js-lazy" data-src={picturePath}></div>
          <div class="entry-small-thumb__title" href={links.routeUrl(entry, "entry")}>
            {entry.get("title")}
          </div>
        </a>
        <div class="entry-small-thumb__author" >by&nbsp;
          {authors.map((userRole, index) =>
            <>
              <a href={links.routeUrl(userRole, "user")}>
                {userRole.get("user_title")}
              </a>{index < authors.length - 1 ? ", " : ""}
            </>
          )}
        </div>
      </div>;
    })}
    {ifFalse(entry && entry.get("id"), () =>
      <div class="text-center"><h4 style="padding-top: 18px">{options.customMessage || "No entry"}</h4></div>
    )}
  </div>;
}

export function eventBanner(event: BookshelfModel) {
  const background = event.related("details").get("background");
  const logo = event.get("logo");
  return <div class="event-banner"
    style={`background-image: url('${background ? background : links.staticUrl("/static/images/default-background.png")}')`}>
    <div class="event-banner__logo">
      <img src={logo} />
    </div>
  </div>;
}

export function entryPlatformIcon(platformName: string, options: { hideLabel?: boolean } = {}) {
  const icon = constants.ENTRY_PLATFORM_ICONS[platformName] || constants.ENTRY_PLATFORM_DEFAULT_ICON;
  return <>
    <span class={`${icon} ml-1`} data-toggle="tooltip" data-placement="top" title={platformName}></span>
    {!options.hideLabel ? platformName : ""}
  </>;
}

export function eventThemeStatus(theme: BookshelfModel, options: { uncensored?: boolean } = {}) {
  const status = theme.get("status");

  let label = capitalize(status);
  let badgeClass = "badge-secondary";
  switch (status) {
  case "banned":
    label = options.uncensored ? "Banned" : "Out";
    break;
  case "duplicate":
    label = "Idea already submitted";
    break;
  case "active":
    badgeClass = "badge-light";
    break;
  case "shortlist":
    badgeClass = "badge-success";
    break;
  default:
  }

  return <span class={"badge " + badgeClass}>
    {label}
  </span>;
}

export function eventShortcutMyEntry(event: BookshelfModel, userEntry: EntryBookshelfModel, options: { noTitle?: boolean } = {}) {
  let customMessage;
  if (event.get("status_entry") === "closed") {
    customMessage = "Entry submissions are closed.";
  } else if (event.get("status_entry") !== "open" && event.get("status_entry") !== "open_unranked") {
    customMessage = "Entry submissions are not open yet.";
  }

  return <div class="action-banner">
    {ifTrue(Boolean(!options.noTitle || userEntry), () =>
      <div class="action-banner__title w-100">
        {ifFalse(options.noTitle, () =>
          <span class="mr-2">Your entry</span>
        )}
        {ifSet(userEntry, () =>
          <a href={links.routeUrl(userEntry, "entry", "edit")} class="btn btn-sm btn-primary">
            <span class="fas fa-pencil-alt"></span>
          Edit entry
          </a>
        )}
      </div>
    )}

    <div class="text-center w-100">
      {entrySmallThumb(userEntry, { customMessage })}
      {ifNotSet(userEntry, () => {
        if (event.get("status_entry") !== "open" && event.get("status_entry") !== "open_unranked") {
          return <a href="#" class="btn btn-outline-secondary disabled mt-2">
            <span class="fas fa-plus mr-1"></span>
            Create entry
          </a>;
        } else {
          return <a href={links.routeUrl(event, "event", "create-entry")} class="btn btn-lg btn-primary mt-2">
            <span class="fas fa-plus mr-1"></span>
            Create entry
          </a>;
        }
      })}
    </div>
  </div>;
}

export function eventShortcutMyPost(user: BookshelfModel, event: BookshelfModel, userPost: BookshelfModel,
                                    options: { noTitle?: boolean; buttonsOnly?: boolean } = {}) {
  return <div class={`action-banner ${options.buttonsOnly ? "buttons-only" : ""}`}>
    <div class="action-banner__title">
      {ifTrue(!options.buttonsOnly && !options.noTitle, () =>
        <span class="mr-2">Your last post</span>
      )}
      <div class="btn-group  btn-group-sm">
        {ifTrue(userPost && !options.buttonsOnly, () =>
          <a href={links.routeUrl(userPost, "post", "edit")} class="btn btn-sm btn-primary mr-2">
            <span class="fas fa-pencil-alt mr-1"></span>
            <span class="d-none d-lg-inline">Edit</span>
          </a>
        )}
        <a href={links.routeUrl(null, "post", "create", { eventId: event.get("id") })} class="btn btn-sm btn-primary mr-2">
          <span class="fas fa-plus mr-1"></span>
          <span class="d-none d-lg-inline">Create post</span>
        </a>
        <a href={links.routeUrl(user, "user", "posts")} class="btn btn-sm btn-primary d-none d-md-inline-block">
          <span class="fas fa-folder mr-1"></span>
          My posts
        </a>
      </div>
    </div>
    {ifFalse(options.buttonsOnly, () =>
      <div class="action-banner__post">
        {ifSet(userPost, () =>
          <a href={links.routeUrl(userPost, "post")}>{userPost.get("title")}</a>
        )}
        {ifNotSet(userPost, () =>
          <div class="text-center"><h4 style="padding-top: 13px">No post</h4></div>
        )}
      </div>
    )}
  </div>;
}
