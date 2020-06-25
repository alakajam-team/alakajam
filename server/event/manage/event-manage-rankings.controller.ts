
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";
import eventService, { FindGamesOptions } from "../event.service";
import forms from "server/core/forms";
import constants from "server/core/constants";
import links from "server/core/links";
import security from "server/core/security";
import { range } from "lodash";

/**
 * Manage the event's entry rankings
 */
export async function viewEventManageRankings(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { event, user } = res.locals;
  await event.load("details");

  if (!security.canUserWrite(user, event)) {
    res.errorPage(403);
    return;
  }

  // Query parameters
  const parameters = parseQueryParameters(req, event);

  // Find all entries
  const findGameOptions: Partial<FindGamesOptions> = {
    eventId: event.get("id"),
    pageSize: null,
    divisions: parameters.currentDivisions,
    withRelated: ["userRoles", "details"]
  };
  if (req.query.orderBy === "ratingCount") {
    findGameOptions.sortBy = "rating-count";
  }
  const entriesCollection = await eventService.findGames(findGameOptions) as BookshelfCollection;

  // Sort by rating category, entries without rankings are last
  const entries = entriesCollection.models;
  entries.sort((e1, e2) => {
    const r1 = e1.related<BookshelfModel>("details").get(`ranking_${parameters.currentCategoryIndex}`);
    const r2 = e2.related<BookshelfModel>("details").get(`ranking_${parameters.currentCategoryIndex}`);
    if (!r1 && !r2) { return e1.get("name").localeCompare(e2.get("name")); }
    if (!r1) { return 1; }
    if (!r2) { return -1; }
    return r1 - r2;
  });

  // Gather additional info
  const categoryTitles = range(1, constants.MAX_CATEGORY_COUNT + 1)
    .map(categoryIndex => eventService.getCategoryTitle(event, categoryIndex));

  res.render("event/manage/event-manage-rankings", {
    entries,
    categoryTitles,
    ...parameters
  });
}

/**
 * Save changes the event's entry rankings
 */
export async function postEventManageRankings(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;

  if (!security.canUserWrite(user, event)) {
    res.errorPage(403);
    return;
  }

  const parameters = parseQueryParameters(req, event);

  // Form validation
  const errors = [];
  const newRanking = forms.sanitizeString(req.body.newRanking) || null;
  if (req.body.newRanking && !forms.isInt(newRanking, { min: 1 })) {
    errors.push({ type: "danger", message: "Invalid ranking" });
  }
  if (!forms.isId(req.body.entryId)) {
    errors.push({ type: "danger", message: "Invalid entry ID" });
  }

  if (errors.length === 0) {
    const entry = await eventService.findEntryById(req.body.entryId, { withRelated: ["details"] });
    if (entry) {
      const entryDetails = entry.related<BookshelfModel>("details");
      entryDetails.set(`ranking_${parameters.currentCategoryIndex}`, newRanking);
      console.log(`ranking_${parameters.currentCategoryIndex} >>>> ${newRanking}`)
      await entryDetails.save();
    } else {
      errors.push({ type: "danger", message: "Entry not found" });
    }
  }

  res.locals.alerts.push(...errors);

  res.redirect(links.routeUrl(event, "event", "edit-rankings")
    + `?division=${parameters.divisionQuery}&categoryIndex=${parameters.currentCategoryIndex}`);

}

function parseQueryParameters(req: CustomRequest, event: BookshelfModel) {
  let currentCategoryIndex = 1;
  if (forms.isInt(req.query.categoryIndex?.toString(), { min: 1, max: constants.MAX_CATEGORY_COUNT })) {
    currentCategoryIndex = forms.parseInt(req.query.categoryIndex);
  }
  const availableDivisions = Object.keys(event.get("divisions"));
  const divisionQuery = forms.sanitizeString(req.query.division?.toString()) || availableDivisions[0];
  let currentDivisions = [availableDivisions[0]];
  if (availableDivisions.includes(divisionQuery)) {
    currentDivisions = [divisionQuery];
  } else if (req.query.division === "all") {
    currentDivisions = availableDivisions;
  }

  return {
    currentCategoryIndex,
    currentDivisions,
    divisionQuery
  };
}
