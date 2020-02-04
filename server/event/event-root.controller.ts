import enums from "server/core/enums";
import links from "server/core/links";

/**
 * Root event page, redirects to its entries
 */
export async function viewDefaultPage(req, res) {
  const { event } = res.locals;

  let page;
  if (![enums.EVENT.STATUS_TOURNAMENT.OFF, enums.EVENT.STATUS_TOURNAMENT.DISABLED]
    .includes(event.get("status_tournament"))) {
    if (event.get("status_tournament") === enums.EVENT.STATUS_TOURNAMENT.RESULTS) {
      page = "tournament-leaderboard";
    } else {
      page = "tournament-games";
    }
  } else if (event.get("status_entry") !== enums.EVENT.STATUS_ENTRY.OFF) {
    if (event.get("status_results") === enums.EVENT.STATUS_RESULTS.RESULTS) {
      page = "results";
    } else {
      page = "games";
    }
  } else {
    page = "announcements";
  }

  res.redirect(links.routeUrl(res.locals.event, "event", page));
}
