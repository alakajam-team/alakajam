
import { BookshelfCollection } from "bookshelf";
import forms from "server/core/forms";
import security from "server/core/security";
import entryHotnessService from "server/entry/entry-hotness.service";
import eventService, { FindGamesOptions } from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { EventLocals } from "../event.middleware";

/**
 * Browse event entries
 */
export async function eventManageEntries(req: CustomRequest, res: CustomResponse<EventLocals>) {
  res.locals.pageTitle += " | Entries";

  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  const event = res.locals.event;

  if (req.query.hotness) {
    await entryHotnessService.refreshEntriesHotness(event);
  }

  // Find all entries
  const findGameOptions: Partial<FindGamesOptions> = {
    eventId: event.get("id"),
    pageSize: null,
    withRelated: ["userRoles", "details"],
  };
  if (req.query.orderBy === "ratingCount") {
    findGameOptions.sortBy = "rating-count";
  }
  const entriesCollection = await eventService.findGames(findGameOptions) as BookshelfCollection;

  // Gather info for karma details
  const entriesById = {};
  entriesCollection.forEach((entry) => {
    entriesById[entry.get("id")] = entry;
  });
  const detailedEntryInfo: any = {};
  const usersById = {};
  if (forms.isId(req.query.entryDetails) && entriesById[forms.parseInt(req.query.entryDetails)]) {
    const eventUsersCollection = await userService.findUsers({ eventId: event.get("id") });
    eventUsersCollection.forEach((user) => {
      usersById[user.get("id")] = user;
    });

    const entry = entriesById[forms.parseInt(req.query.entryDetails)];
    await entry.load(["comments", "votes"]);
    detailedEntryInfo.id = req.query.entryDetails;
    detailedEntryInfo.given = await eventRatingService.computeKarmaGivenByUserAndEntry(entry, event);
    detailedEntryInfo.received = await eventRatingService.computeKarmaReceivedByUser(entry);
    detailedEntryInfo.total = eventRatingService.computeKarma(detailedEntryInfo.received.total,
      detailedEntryInfo.given.total);
  }

  res.render("event/manage/event-manage-entries", {
    entries: entriesCollection.models,
    entriesById,
    usersById,
    detailedEntryInfo,
  });
}
