import { ModelAny } from "bookshelf";
import { Request } from "express";
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import eventService from "server/event/event.service";
import { CustomResponse } from "server/types";

/**
 * Manage user entries
 */
export async function dashboardEntries(req: Request, res: CustomResponse<CommonLocals>) {
  const { user, featuredEvent } = res.locals;

  const entryCollection = await eventService.findUserEntries(user);

  const alakajamEntries: ModelAny[] = [];
  const otherEntries: ModelAny[] = [];
  const externalEntries: ModelAny[] = [];
  entryCollection.models.forEach((entry) => {
    if (entry.get("external_event") != null) {
      externalEntries.push(entry);
    } else if (entry.related("event").get("status_theme") !== enums.EVENT.STATUS_THEME.DISABLED) {
      alakajamEntries.push(entry);
    } else {
      otherEntries.push(entry);
    }
  });

  let featuredEventEntry;
  if (featuredEvent) {
    featuredEventEntry = await eventService.findUserEntryForEvent(user, featuredEvent.get("id"));
  }

  res.render("user/dashboard/dashboard-entries", {
    alakajamEntries,
    otherEntries,
    externalEntries,
    featuredEventEntry,
  });
}
