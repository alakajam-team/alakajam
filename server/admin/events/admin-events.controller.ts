import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";
import eventService from "../../event/event.service";
import entryHotnessService from "server/entry/entry-hotness.service";
import { adminEventsTemplate } from "./admin-events.template";

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

  res.renderJSX(adminEventsTemplate, {
    ...res.locals,
    events: eventsCollection.models
  });
}
