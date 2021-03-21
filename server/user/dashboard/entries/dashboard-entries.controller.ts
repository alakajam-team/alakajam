import { BookshelfModel } from "bookshelf";
import { CommonLocals } from "server/common.middleware";
import entryService from "server/entry/entry.service";
import eventService from "server/event/event.service";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * Manage user entries
 */
export async function dashboardEntries(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const { user, featuredEvent } = res.locals;

  const entryCollection = await entryService.findUserEntries(user);

  const alakajamEntries: BookshelfModel[] = [];
  const otherEntries: BookshelfModel[] = [];
  const externalEntries: BookshelfModel[] = [];
  entryCollection.models.forEach((entry) => {
    if (entry.get("external_event") != null) {
      externalEntries.push(entry);
    } else if (eventService.isMainAlakajamEvent(entry.related<BookshelfModel>("event"))) {
      alakajamEntries.push(entry);
    } else {
      otherEntries.push(entry);
    }
  });

  let featuredEventEntry;
  if (featuredEvent) {
    featuredEventEntry = await entryService.findUserEntryForEvent(user, featuredEvent.get("id"));
  }

  res.render<CommonLocals>("user/dashboard/entries/dashboard-entries", {
    ...res.locals,
    alakajamEntries,
    otherEntries,
    externalEntries,
    featuredEventEntry,
  });
}
