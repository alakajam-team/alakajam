
import enums from "server/core/enums";
import forms from "server/core/forms";
import eventService from "server/event/event.service";
import userService from "server/user/user.service";

/**
 * People listing
 */
export async function people(req, res) {
  res.locals.pageTitle = "People";

  const PAGE_SIZE = 30;

  // Parse query
  let currentPage = 1;
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p, 10);
  }
  const searchOptions: any = {
    pageSize: PAGE_SIZE,
    page: currentPage,
    withEntries: req.query.withEntries,
    entriesCount: true,
  };
  searchOptions.search = forms.sanitizeString(req.query.search);
  if (req.query.eventId === "none") {
    searchOptions.eventId = null;
  } else {
    searchOptions.eventId = forms.isId(req.query.eventId) ? req.query.eventId : undefined;
  }

  // Fetch info
  const usersCollection = await userService.findUsers(searchOptions);
  const eventsCollection = await eventService.findEvents({ statusNot: enums.EVENT.STATUS.PENDING });
  let searchedEvent = null;
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.findWhere({ id: parseInt(searchOptions.eventId, 10) });
  }

  res.render("people", {
    searchOptions,
    searchedEvent,
    users: usersCollection.sortBy((user) => -user.get("id")),
    userCount: usersCollection.pagination.rowCount,
    pageCount: usersCollection.pagination.pageCount,
    currentPage,
    events: eventsCollection.models,
  });
}

export async function peopleMods(req, res) {
  res.locals.pageTitle = "Admins & mods";

  const adminsCollection = await userService.findUsers({ isAdmin: true, orderBy: "title" });
  const modsCollection = await userService.findUsers({ isMod: true, orderBy: "title" });
  modsCollection.remove(adminsCollection.models);

  res.render("people-mods", {
    mods: modsCollection.models,
    admins: adminsCollection.models,
  });
}
