import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import { CustomRequest, CustomResponse } from "server/types";
import eventService from "../event/event.service";

export type TopEntriesByDivision = Record<"solo" | "team", BookshelfModel[]>;

export interface EventsContext extends CommonLocals {
  open: BookshelfModel[];
  pending: BookshelfModel[];
  closedAlakajam: BookshelfModel[];
  closedOther: BookshelfModel[];
  featuredEntries: Record<number, TopEntriesByDivision>;
}

/**
 * Events listing
 */
export async function events(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "Events";

  const pending: BookshelfModel[] = [];
  const open: BookshelfModel[] = [];
  const closedAlakajam: BookshelfModel[] = [];
  const closedOther: BookshelfModel[] = [];

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
      if (event.get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
        closedAlakajam.push(event);
      } else {
        closedOther.push(event);
      }

      if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
        const topEntries = await eventService.findGames({
          eventId: event.get("id"),
          sortBy: "ranking",
          pageSize: 6,
          withRelated: ["details", "userRoles"],
        }) as BookshelfCollection;
        const topEntriesByDivision: TopEntriesByDivision = { solo: [], team: [] };
        topEntries.forEach((entry) => {
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

  res.renderJSX<EventsContext>("explore/events", {
    ...res.locals,
    pending,
    open,
    closedAlakajam,
    closedOther,
    featuredEntries,
  });
}
