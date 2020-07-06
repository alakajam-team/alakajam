import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import eventService from "server/event/event.service";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * Manage user entries
 */
export async function dashboardEntries(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  const { user, featuredEvent } = res.locals;

  const entryCollection = await eventService.findUserEntries(user);

  const alakajamEntries: BookshelfModel[] = [];
  const otherEntries: BookshelfModel[] = [];
  const externalEntries: BookshelfModel[] = [];
  entryCollection.models.forEach((entry) => {
    if (entry.get("external_event") != null) {
      externalEntries.push(entry);
    } else if (entry.related<BookshelfModel>("event").get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
      alakajamEntries.push(entry);
    } else {
      otherEntries.push(entry);
    }
  });

  let featuredEventEntry;
  if (featuredEvent) {
    featuredEventEntry = await eventService.findUserEntryForEvent(user, featuredEvent.get("id"));
  }

  res.renderJSX<CommonLocals>("user/dashboard/dashboard-entries", {
    ...res.locals,
    alakajamEntries,
    otherEntries,
    externalEntries,
    featuredEventEntry,
  });
}
