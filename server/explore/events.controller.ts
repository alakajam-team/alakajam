import { BookshelfCollection, BookshelfModel, EntryBookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import entryService from "server/entry/entry.service";
import { CustomRequest, CustomResponse } from "server/types";
import eventService from "../event/event.service";

export type TopEntriesByDivision = Record<string, EntryBookshelfModel[]>;

export interface EventsContext extends CommonLocals {
  open: BookshelfModel[];
  pending: BookshelfModel[];
  closed: BookshelfModel[];
  featuredEntries: Record<number, TopEntriesByDivision>;
}

/**
 * Events listing
 */
export async function events(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  res.locals.pageTitle = "Events";

  const pending: BookshelfModel[] = [];
  const open: BookshelfModel[] = [];
  const closed: BookshelfModel[] = [];

  const allEventsCollection = await eventService.findEvents();

  // Group entries by status, gather featured entries
  const featuredEntries: Record<number, TopEntriesByDivision> = {};
  for (const event of allEventsCollection.models) {
    switch (event.get("status")) {
    case enums.EVENT.STATUS.PENDING:
      pending.unshift(event); // sort by ascending dates
      break;
    case enums.EVENT.STATUS.OPEN:
      open.push(event);
      break;
    default:
      closed.push(event);

      if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
        const topEntries = await entryService.findEntries({
          eventId: event.get("id"),
          sortBy: "ranking",
          pageSize: 6,
          withRelated: ["details", "userRoles"],
        }) as BookshelfCollection;
        const topEntriesByDivision: TopEntriesByDivision = {};
        topEntries.forEach((entry: EntryBookshelfModel) => {
          const division = entry.get("division");
          if (!topEntriesByDivision[division]) {
            topEntriesByDivision[division] = [];
          }
          if (topEntriesByDivision[division].length < 3
               && entry.related<BookshelfModel>("details").get("ranking_1")) {
            topEntriesByDivision[division].push(entry);
          }
        });
        featuredEntries[event.get("id")] = topEntriesByDivision;
      }
    }
  }

  res.render<EventsContext>("explore/events", {
    ...res.locals,
    pending,
    open,
    closed,
    featuredEntries,
  });
}
