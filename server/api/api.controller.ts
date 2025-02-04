import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as lodash from "lodash";
import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import enums from "server/core/enums";
import { createLuxonDate } from "server/core/formats";
import forms from "server/core/forms";
import links from "server/core/links";
import { ThemeShortlistEliminationState } from "server/entity/event-details.entity";
import entryService from "server/entry/entry.service";
import eventService from "server/event/event.service";
import themeShortlistService from "server/event/theme/theme-shortlist.service";
import themeService from "server/event/theme/theme.service";
import { CustomRequest, CustomResponse } from "server/types";
import * as url from "url";
import userService from "../user/user.service";

type Json = Record<string, any>;

const PUBLIC_ATTRIBUTES_EVENT = ["id", "name", "title", "display_dates", "display_theme", "status", "status_theme",
  "status_entry", "status_results", "countdown_config", "started_at"];
const PUBLIC_ATTRIBUTES_ENTRY = ["id", "event_id", "event_name", "name", "title", "description", "links", "pictures",
  "category", "comment_count", "karma", "division"];
const PUBLIC_ATTRIBUTES_ENTRY_DETAILS = ["body", "optouts", "rating_count"];
const PUBLIC_ATTRIBUTES_ENTRY_DETAILS_RESULTS = ["rating_1", "rating_2", "rating_3", "rating_4", "rating_5", "rating_6",
  "ranking_1", "ranking_2", "ranking_3", "ranking_4", "ranking_5", "ranking_6"];
const PUBLIC_ATTRIBUTES_USER = ["id", "name", "title", "avatar", "is_mod", "is_admin"];
const PUBLIC_ATTRIBUTES_COMMENT = ["id", "user_id", "parent_id", "body", "created_at", "updated_at"];

const DETAILED_ENTRY_OPTIONS = { withRelated: ["comments", "details", "userRoles.user", "event"] };

/**
 * Data about the currently featured event
 */
export async function getFeaturedEvent(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  if (res.locals.featuredEvent) {
    req.params.event = res.locals.featuredEvent.get("id");
    return getEvent(req, res);
  } else {
    _renderJson(req, res, 404, { error: "No featured event" });
  }
}

/**
 * Event timeline
 */
export async function getEventTimeline(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let json: Json = {};
  let status = 200;

  let page = 0;
  try {
    if (forms.isInt(req.query.page?.toString())) {
      page = Math.max(0, forms.parseInt(req.query.page.toString()));
    }
  } catch {
    json = { error: "Invalid page number" };
    status = 401;
  }

  const events = await eventService.findEvents({
    pageSize: 10,
    page,
  });

  json = events.map((event) => {
    const eventJson = _getAttributes(event, PUBLIC_ATTRIBUTES_EVENT);
    eventJson.url = url.resolve(config.ROOT_URL, links.routeUrl(event, "event"));
    return eventJson;
  });
  _renderJson(req, res, status, json);
}

/**
 * Data about a specific event
 */
export async function getEvent(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let json: Json = {};
  let status = 200;

  let event;
  if (req.params.event && forms.isId(req.params.event)) {
    event = await eventService.findEventById(forms.sanitizeInt(req.params.event));
  } else {
    event = await eventService.findEventByName(req.params.event);
  }

  if (event) {
    json = _getAttributes(event, PUBLIC_ATTRIBUTES_EVENT);
    json.url = url.resolve(config.ROOT_URL, links.routeUrl(event, "event"));

    if (json.countdown_config && json.countdown_config.date) {
      let result = json.title + " " + json.countdown_config.phrase;

      const msCountdown = createLuxonDate(json.countdown_config.date).diffNow();
      if (msCountdown.milliseconds > 0) {
        result += " in ";
        const countdown = msCountdown.shiftTo("days", "hours", "minutes", "seconds", "milliseconds");
        if (countdown.days > 0) { result += `${countdown.days} day${countdown.days !== 1 ? "s" : ""} `; }
        if (countdown.hours > 0) { result += `${countdown.hours} hour${countdown.hours !== 1 ? "s" : ""} `; }
        if (countdown.minutes > 0) { result += `${countdown.minutes} minute${countdown.minutes !== 1 ? "s" : ""} `; }
        result += `${countdown.seconds} second${countdown.seconds !== 1 ? "s" : ""}`;
      } else {
        result += " now!";
      }

      json.countdown_formatted = result;
    }

    await event.load("entries.userRoles.user");
    json.entries = [];
    for (const entry of event.related("entries").models) {
      const entryJson = _getAttributes(entry, PUBLIC_ATTRIBUTES_ENTRY);

      entryJson.users = [];
      for (const user of entry.related("userRoles").models) {
        entryJson.users.push(_getAttributes(user.related("user"), PUBLIC_ATTRIBUTES_USER));
      }
      json.entries.push(entryJson);
    }
  } else {
    json = { error: "Event not found" };
    status = 404;
  }

  _renderJson(req, res, status, json);
}

/**
 * Data about the theme shortlist of an event
 */
export async function getEventShortlist(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let json: Json = {};
  let status = 200;

  let event: BookshelfModel;
  if (req.params.event && forms.isId(req.params.event)) {
    event = await eventService.findEventById(forms.sanitizeInt(req.params.event));
  } else {
    event = await eventService.findEventByName(req.params.event);
  }

  if (event) {
    const shortlist = await themeShortlistService.findShortlist(event);
    const shortlistElimination: ThemeShortlistEliminationState = event.related<BookshelfModel>("details").get("shortlist_elimination");

    if (shortlist.length > 0) {
      let eliminatedThemes = shortlistElimination.eliminatedCount || 0;
      if (event.get("status_theme") === enums.EVENT.STATUS_THEME.RESULTS) {
        eliminatedThemes = shortlist.length - 1;
      }

      let topVotes: BookshelfModel[] = [];
      if ([enums.EVENT.STATUS_THEME.CLOSED, enums.EVENT.STATUS_THEME.RESULTS].includes(event.get("status_theme"))) {
        topVotes = (await themeShortlistService.findThemeShortlistVotes(event, { score: shortlist.length })).models;
      }

      // Build data
      const rawShortlist: Array<{title: string; eliminated: boolean; ranking?: number; topPickOf: string[]}> = [];
      shortlist
        .forEach((theme: BookshelfModel, i: number) => {
          const rank = i + 1;
          const eliminated = eliminatedThemes > shortlist.length - rank;
          rawShortlist.push({
            title: theme.get("title"),
            eliminated,
            ranking: eliminated ? rank : undefined,
            topPickOf: topVotes
              .filter(vote => vote.get("theme_id") === theme.get("id"))
              .map(vote => vote.related<BookshelfModel>("user").get("title"))
          });
        });

      // Obfuscate order for active themes
      const activeShortlist = rawShortlist.filter((themeInfo) => !themeInfo.eliminated);
      const eliminatedShortlist = rawShortlist.filter((themeInfo) => themeInfo.eliminated);
      json.shortlist = lodash.sortBy(activeShortlist, (themeInfo) => themeInfo.title).concat(eliminatedShortlist);
      json.nextElimination = shortlistElimination.nextElimination;
      json.minutesBetweenEliminations = shortlistElimination.minutesBetweenEliminations;
      json.eliminatedCount = shortlistElimination.eliminatedCount || 0;
    } else {
      json = { error: "Event does not have a theme shortlist" };
      status = 403;
    }
  } else {
    json = { error: "Event not found" };
    status = 404;
  }

  _renderJson(req, res, status, json);
}

/**
 * Data about a specific entry
 */
export async function getEntry(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let json: Json = {};
  let status = 200;

  if (forms.isId(req.params.entry)) {
    const entry = await entryService.findEntryById(parseInt(req.params.entry, 10), DETAILED_ENTRY_OPTIONS);

    if (entry) {
      json = _getDetailedEntryJson(entry);
    } else {
      json = { error: "Entry not found" };
      status = 404;
    }
  } else {
    json = { error: "Invalid entry ID" };
    status = 400;
  }

  _renderJson(req, res, status, json);
}

/**
 * Transforms an entry model into detailed JSON info
 * @param entry must be fetched with DETAILED_ENTRY_OPTIONS
 */
function _getDetailedEntryJson(entry: BookshelfModel): Json {
  const json = _getAttributes(entry, PUBLIC_ATTRIBUTES_ENTRY);
  json.url = url.resolve(config.ROOT_URL, links.routeUrl(entry, "entry"));

  const entryDetails = entry.related<BookshelfModel>("details");
  Object.assign(json, _getAttributes(entryDetails, PUBLIC_ATTRIBUTES_ENTRY_DETAILS));

  const event = entry.related("event");
  if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
    json.results = _getAttributes(entryDetails, PUBLIC_ATTRIBUTES_ENTRY_DETAILS_RESULTS);
  }

  json.comments = [];
  for (const comment of entry.related<BookshelfCollection>("comments").models) {
    json.comments.push(_getAttributes(comment, PUBLIC_ATTRIBUTES_COMMENT));
  }

  json.users = [];
  for (const user of entry.related<BookshelfCollection>("userRoles").models) {
    json.users.push(_getAttributes(user.related("user"), PUBLIC_ATTRIBUTES_USER));
  }

  return json;
}

/**
 * Data about a specific user
 */
export async function getUser(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let json: Json = {};
  let status = 200;

  let user;
  if (forms.isId(req.params.user)) {
    user = await userService.findById(parseInt(req.params.user, 10));
  } else {
    user = await userService.findByName(req.params.user);
  }

  if (user) {
    json = _getAttributes(user, PUBLIC_ATTRIBUTES_USER);
    json.url = url.resolve(config.ROOT_URL, links.routeUrl(user, "user"));

    json.entries = [];
    for (const entry of (await entryService.findUserEntries(user)).models) {
      json.entries.push(_getAttributes(entry, PUBLIC_ATTRIBUTES_ENTRY));
    }
  } else {
    json = { error: "User not found" };
    status = 404;
  }

  _renderJson(req, res, status, json);
}

export async function getUserLatestEntry(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let json: Json = {};
  let status = 200;

  let user;
  if (forms.isId(req.params.user)) {
    user = await userService.findById(parseInt(req.params.user, 10));
  } else {
    user = await userService.findByName(req.params.user);
  }

  if (user) {
    json = _getAttributes(user, PUBLIC_ATTRIBUTES_USER);

    const entry = await entryService.findLatestUserEntry(user);
    if (entry) {
      json.latest_entry = _getDetailedEntryJson(await entryService.findLatestUserEntry(user, DETAILED_ENTRY_OPTIONS));
      json.latest_entry.url = url.resolve(config.ROOT_URL, links.routeUrl(entry, "entry"));
    }
  } else {
    json = { error: "User not found" };
    status = 404;
  }

  _renderJson(req, res, status, json);
}

export async function getUserSearch(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  let json: Json = {};
  let status = 200;

  let page = 0;
  try {
    if (req.query.page) {
      page = Math.max(0, forms.parseInt(req.query.page.toString()));
    }
  } catch {
    json = { error: "Invalid page number" };
    status = 401;
  }

  if (!("error" in json)) {
    const users = await userService.findUsers({
      search: req.query.title?.toString(),
      pageSize: 30,
      page,
    });

    json.users = [];
    for (const user of users) {
      const userJson = _getAttributes(user as any, PUBLIC_ATTRIBUTES_USER);
      userJson.url = url.resolve(config.ROOT_URL, links.routeUrl(user, "user"));
      json.users.push(userJson);
    }
  }

  _renderJson(req, res, status, json);
}

export async function getThemeStats(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const title = forms.sanitizeString(req.params.theme);
  const themes = await themeService.findThemesByTitle(title, {
    withRelated: ["event.details"]
  });

  const themesStats = [];
  for (const theme of themes.models) {
    const event = theme.related<BookshelfModel>("event");
    if (event.get("status_theme") === enums.EVENT.STATUS_THEME.RESULTS) {
      const themeStats: {ranking?: number; eventTitle?: string} = {
        eventTitle: event.get("title")
      };
      if (theme.get("ranking") && theme.get("status") !== enums.THEME.STATUS.SHORTLIST) {
        // Use rough ranking estimate
        themeStats.ranking = Math.floor(theme.get("ranking") * event.related<BookshelfModel>("details").get("theme_count"));
      } else {
        // Use true ranking (needed for shortlisted themes at least)
        themeStats.ranking = await themeService.findThemeRanking(theme, { useShortlistRating: true });
      }
      if (theme.get("notes") > 0) { // Ignore themes that haven't received any votes (eg. duplicates)
        themesStats.push(themeStats);
      }
    }
  }

  _renderJson(req, res, 200, themesStats);
}

function _renderJson(req: CustomRequest, res: CustomResponse<CommonLocals>, statusCode: number, json: Json) {
  res.status(statusCode);
  if (req.query.pretty) {
    res.locals.pageTitle = "API Preview for " + req.path;
    res.render<CommonLocals>("api/api-pretty", {
      ...res.locals,
      apiPath: req.path,
      json
    });
  } else {
    res.jsonp(json);
  }
}

function _getAttributes(model: BookshelfModel, whiteList: string[]): Json {
  const values = {};
  for (const attribute of whiteList) {
    values[attribute] = model.get(attribute);
  }
  return values;
}
