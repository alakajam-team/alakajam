import { CommonLocals } from "server/common.middleware";
import entryHotnessService from "server/entry/entry-hotness.service";
import { CustomRequest, CustomResponse } from "server/types";
import eventService from "../../event/event.service";
import { BookshelfModel } from "bookshelf";

export interface AdminEventsContext extends CommonLocals {
  events: BookshelfModel[];
}

/**
 * Events management
 */
export async function adminEvents(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  const eventsCollection = await eventService.findEvents();

  if (req.query.refreshHotness) {
    for (const event of eventsCollection.models) {
      await entryHotnessService.refreshEntriesHotness(event);
    }
    res.locals.alerts.push({ type: "success", message: "Hotness recalculated on all entries." });
    res.redirect("?");
    return;
  }

  res.renderJSX<AdminEventsContext>("admin/events/admin-events", {
    ...res.locals,
    events: eventsCollection.models
  });
}
