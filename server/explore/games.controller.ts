import { CommonLocals } from "server/common.middleware";
import security from "server/core/security";
import settings from "server/core/settings";
import { SETTING_EVENT_REQUIRED_ENTRY_VOTES } from "server/core/settings-keys";
import platformService from "server/entry/platform/platform.service";
import { handleGameSearch } from "server/event/event-games.controller";
import eventService from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import { CustomRequest, CustomResponse } from "server/types";
import { BookshelfModel } from "bookshelf";

/**
 * Game browser
 */
export async function games(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "Games";

  const { user, featuredEvent } = res.locals;

  // Parse query
  const searchOptions = await handleGameSearch(req, res.locals);

  // Fetch info
  let rescueEntries = [];
  let requiredVotes = null;
  if (featuredEvent && featuredEvent.get("status_results") === "voting_rescue") {
    const canVoteInEvent = await eventRatingService.canVoteInEvent(user, featuredEvent);
    if (canVoteInEvent || security.isMod(user)) {
      rescueEntries = (await eventService.findRescueEntries(featuredEvent, user)).models;
      requiredVotes = await settings.findNumber(SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
    }
  }

  const [entriesCollection, platformCollection, eventsCollection] = await Promise.all([
    eventService.findGames(searchOptions),
    platformService.fetchAll(),
    eventService.findEvents({ allowingEntries: true })
  ]);

  let searchedEvent: BookshelfModel;
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.find((event) => event.id === searchOptions.eventId);
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
