import constants from "server/core/constants";
import security from "server/core/security";
import settings from "server/core/settings";
import platformService from "server/entry/platform/platform.service";
import { handleGameSearch } from "server/event/event-games.controller";
import eventService from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";

/**
 * Game browser
 */
export async function games(req, res) {
  res.locals.pageTitle = "Games";

  const { user, featuredEvent } = res.locals;

  // Parse query
  const searchOptions: any = await handleGameSearch(req, res);

  // Fetch info
  // TODO Parallelize tasks
  let rescueEntries = [];
  let requiredVotes = null;
  if (featuredEvent && featuredEvent.get("status_results") === "voting_rescue") {
    const canVoteInEvent = await eventRatingService.canVoteInEvent(user, featuredEvent);
    if (canVoteInEvent || security.isMod(user)) {
      rescueEntries = (await eventService.findRescueEntries(featuredEvent, user)).models;
      requiredVotes = await settings.findNumber(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
    }
  }
  const entriesCollection = await eventService.findGames(searchOptions);
  const platformCollection = await platformService.fetchAll();

  const eventsCollection = await eventService.findEvents({ ignoreTournaments: true });
  let searchedEvent = null;
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.find((event) => event.id === parseInt(searchOptions.eventId, 10));
  }

  res.render("explore/games", {
    searchOptions,
    searchedEvent,
    entriesCollection,
    rescueEntries,
    requiredVotes,
    events: eventsCollection.models,
    platforms: platformCollection.models,
  });
}
