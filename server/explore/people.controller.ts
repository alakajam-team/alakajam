
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import forms from "server/core/forms";
import eventService from "server/event/event.service";
import { CustomRequest, CustomResponse } from "server/types";
import userService, { FindUserOptions } from "server/user/user.service";

/**
 * People listing
 */
export async function people(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "People";

  const PAGE_SIZE = 30;

  // Parse query
  let currentPage = 1;
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p?.toString(), 10);
  }
  const searchOptions: FindUserOptions = {
    pageSize: PAGE_SIZE,
    page: currentPage,
    withEntries: Boolean(req.query.withEntries),
    entriesCount: true,
    orderBy: "id",
    orderByDesc: true
  };
  searchOptions.search = forms.sanitizeString(req.query.search?.toString());
  if (req.query.eventId === "none") {
    searchOptions.eventId = null;
  } else {
    searchOptions.eventId = forms.isId(req.query.eventId) ? parseInt(req.query.eventId?.toString(), 10) : undefined;
  }

  // Fetch info
  const users = await userService.findUsers(searchOptions);
  const userCount = await userService.countUsers(searchOptions);
  const eventsCollection = await eventService.findEvents({ statusNot: enums.EVENT.STATUS.PENDING });
  let searchedEvent = null;
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.find((event) => event.id === searchOptions.eventId);
  }

  res.renderJSX<CommonLocals>("explore/people", {
    ...res.locals,
    searchOptions,
    searchedEvent,
    users,
    userCount,
    pageCount: Math.ceil(userCount / PAGE_SIZE),
    currentPage,
    events: eventsCollection.models
  });
}
