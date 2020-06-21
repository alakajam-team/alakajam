import enums from "server/core/enums";
import forms from "server/core/forms";
import log from "server/core/log";
import security from "server/core/security";
import settings from "server/core/settings";
import { SETTING_EVENT_REQUIRED_ENTRY_VOTES } from "server/core/settings-keys";
import platformService from "server/entry/platform/platform.service";
import tagService from "server/entry/tag/tag.service";
import eventService, { FindGamesOptions } from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { EventLocals } from "./event.middleware";
import { CommonLocals } from "server/common.middleware";

/**
 * Browse event games
 */
export async function viewEventGames(req: CustomRequest, res: CustomResponse<EventLocals>) {
  res.locals.pageTitle += " | Games";

  const { user, event } = res.locals;
  if (event.get("status_entry") === enums.EVENT.STATUS_ENTRY.OFF) {
    res.errorPage(404);
    return;
  }

  // Search form & pagination
  const searchOptions = await handleGameSearch(req, res, {
    eventId: event.get("id"),
  });

  // Search entries
  let rescueEntries = [];
  if (event.get("status_results") === "voting_rescue") {
    const canVoteInEvent = await eventRatingService.canVoteInEvent(user, event);
    if (canVoteInEvent || security.isMod(user)) {
      rescueEntries = (await eventService.findRescueEntries(event, user)).models;
    }
  }
  const requiredVotes = await settings.findNumber(SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
  const entriesCollection = await eventService.findGames(searchOptions);
  const platformCollection = await platformService.fetchAll();

  // Fetch vote history
  let voteHistory = [];
  if (user && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE,
    enums.EVENT.STATUS_RESULTS.RESULTS].includes(event.get("status_results"))) {
    const voteHistoryCollection = await eventRatingService.findVoteHistory(user.get("id"), event, { pageSize: 5 });
    voteHistory = voteHistoryCollection.models;
  }

  res.render("event/event-games", {
    rescueEntries,
    requiredVotes,
    entriesCollection,
    voteHistory,
    searchOptions,
    platforms: platformCollection.models,
  });
}

/**
 * Fills a searchOptions object according to the request GET parameters
 * @param  {Request} req
 * @param  {object} searchOptions initial search options
 * @return {object} search options
 */
export async function handleGameSearch(
  req: CustomRequest,
  res: CustomResponse<CommonLocals>,
  searchOptions: FindGamesOptions = {}): Promise<FindGamesOptions> {

  // Pagination
  searchOptions.pageSize = 20;
  searchOptions.page = 1;
  if (forms.isId(req.query.p)) {
    searchOptions.page = forms.parseInt(req.query.p);
  }

  // Text search
  searchOptions.search = forms.sanitizeString(req.query.search?.toString());

  // User search
  if (forms.isId(req.query.user)) {
    searchOptions.userId = forms.parseInt(req.query.user);
    searchOptions.user = await userService.findById(searchOptions.userId);
  }

  // Division
  if (req.query.divisions) {
    const divisions = Array.isArray(req.query.divisions) ? req.query.divisions : [req.query.divisions];
    searchOptions.divisions = divisions.map(division => forms.sanitizeString(division?.toString()));

    // Hack for Kajam's ranked division
    if (searchOptions.divisions.includes(enums.DIVISION.SOLO) ||
        searchOptions.divisions.includes(enums.DIVISION.TEAM)) {
      searchOptions.divisions.push(enums.DIVISION.RANKED);
    }
  }
  if (searchOptions.divisions && searchOptions.divisions.length === Object.keys(enums.DIVISION).length) {
    searchOptions.divisions = undefined;
  }

  // Platforms
  if (req.query.platforms) {
    const platformsRaw = (Array.isArray(req.query.platforms)) ? req.query.platforms : [req.query.platforms];
    let platforms = platformsRaw.map(platform => platform.toString());
    const platformsIds = platforms.map((str) => forms.parseInt(str));
    if (platformsIds.includes(NaN)) {
      platforms = [];
      log.error("Invalid platform query: " + req.query.platforms);
    }
    searchOptions.platforms = platforms;
  }

  // Tags
  if (req.query.tags) {
    const tagsRaw = (Array.isArray(req.query.tags)) ? req.query.tags : [req.query.tags];
    let tagIds = tagsRaw.map((str) => forms.parseInt(str));
    if (tagIds.includes(NaN)) {
      tagIds = [];
      log.error("Invalid tag query: " + req.query.tags);
    }
    const tagCollection = await tagService.fetchByIds(tagIds);
    searchOptions.tags = tagCollection.map((tag) => ({ id: tag.get("id"), value: tag.get("value") }));
  }

  // Event
  let event = forms.isId(req.query.eventId) ? await eventService.findEventById(forms.parseInt(req.query.eventId)) : undefined;
  if (!event) {
    event = res.locals.event;
  }
  searchOptions.eventId = event ? event.get("id") : null;

  // Sorting
  if (event && event.get("status_results") !== enums.EVENT.STATUS_RESULTS.RESULTS) {
    searchOptions.sortBy = "karma";
  } else {
    searchOptions.sortBy = "hotness";
  }

  // Hide rated/commented
  if (req.query.hideReviewed && res.locals.user) {
    searchOptions.notReviewedById = res.locals.user.get("id");
  }

  // Other filters
  searchOptions.highScoresSupport = Boolean(req.query.highScoresSupport);
  searchOptions.allowsTournamentUse = Boolean(req.query.allowsTournamentUse);

  return searchOptions;
}
