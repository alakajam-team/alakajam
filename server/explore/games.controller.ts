import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import security from "server/core/security";
import settings from "server/core/settings";
import { SETTING_EVENT_REQUIRED_ENTRY_VOTES } from "server/core/settings-keys";
import entryService from "server/entry/entry.service";
import platformService from "server/entry/platform/platform.service";
import eventService from "server/event/event.service";
import { handleGameSearch } from "server/event/games/event-games.controller";
import eventRatingService from "server/event/rating/event-rating.service";
import { CustomRequest, CustomResponse } from "server/types";

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
      rescueEntries = (await entryService.findRescueEntries(featuredEvent, user)).models;
      requiredVotes = await settings.findNumber(SETTING_EVENT_REQUIRED_ENTRY_VOTES, 10);
    }
  }

  const [entriesCollection, platformCollection, eventsCollection] = await Promise.all([
    entryService.findEntries(searchOptions),
    platformService.fetchAll(),
    eventService.findEvents({ allowingEntries: true })
  ]);

  let searchedEvent: BookshelfModel;
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.find((event) => event.id === searchOptions.eventId);
  }

  res.render<CommonLocals>("explore/games", {
    ...res.locals,
    searchOptions,
    searchedEvent,
    entriesCollection,
    rescueEntries,
    requiredVotes,
    events: eventsCollection.models,
    platforms: platformCollection.models,
  });
}
