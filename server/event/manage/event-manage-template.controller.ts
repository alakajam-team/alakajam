
import security from "server/core/security";
import eventService from "server/event/event.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";

export async function eventManageTemplate(req: CustomRequest, res: CustomResponse<EventLocals>) {
  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  res.render("event/manage/event-manage-template", {
    eventTemplates: (await eventService.findEventTemplates()).models,
  });
}
