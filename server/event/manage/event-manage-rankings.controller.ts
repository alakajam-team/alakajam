
import { BookshelfCollection } from "bookshelf";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";
import eventService, { FindGamesOptions } from "../event.service";

/**
 * Manage the event's entry rankings
 */
export async function eventManageRankings(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { event } = res.locals;

  // Find all entries
  const findGameOptions: Partial<FindGamesOptions> = {
    eventId: event.get("id"),
    pageSize: null,
    divisions: ["solo", "team"],
    withRelated: ["userRoles", "details"],
  };
  if (req.query.orderBy === "ratingCount") {
    findGameOptions.sortBy = "rating-count";
  }
  const entriesCollection = await eventService.findGames(findGameOptions) as BookshelfCollection;

  const entries = entriesCollection.models;
  entries.sort((e1, e2) => {
    return e1.related("details").get("ranking_1") - e2.related("details").get("ranking_1");
  });

  res.render("event/manage/event-manage-rankings", {
    entries
  });
}
