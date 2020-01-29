import { BookshelfCollection, BookshelfModel } from "bookshelf";
import enums from "server/core/enums";
import eventService from "../event/event.service";

/**
 * Events listing
 */
export async function events(req, res) {
  res.locals.pageTitle = "Events";

  const pending = [];
  const open = [];
  const closedAlakajam = [];
  const closedOther = [];

  const allEventsCollection = await eventService.findEvents();

  // Group entries by status, gather featured entries
  const featuredEntries = {};
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
            sortByRanking: true,
            pageSize: 6,
            withRelated: ["details", "userRoles"],
          }) as BookshelfCollection;
          const topEntriesByDivision = {};
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

  res.render("explore/events", {
    pending,
    open,
    closedAlakajam,
    closedOther,
    featuredEntries,
  });
}
