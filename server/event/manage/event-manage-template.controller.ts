
import security from "server/core/security";
import eventService from "server/event/event.service";

export async function eventManageTemplate(req, res) {
  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  res.render("event/manage/event-manage-template", {
    eventTemplates: (await eventService.findEventTemplates()).models,
  });
}
