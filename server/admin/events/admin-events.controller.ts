import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";
import eventService from "../../event/event.service";

/**
 * Events management
 */
export async function adminEvents(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  const eventsCollection = await eventService.findEvents();
  res.render("admin/events/admin-events", {
    events: eventsCollection.models,
  });
}
