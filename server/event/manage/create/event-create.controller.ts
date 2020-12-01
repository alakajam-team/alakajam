
import { CommonLocals } from "server/common.middleware";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";
import eventTemplateService from "./event-template.service";

export async function eventCreate(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  res.render<CommonLocals>("event/manage/create/event-create", {
    ...res.locals,
    eventTemplates: (await eventTemplateService.findEventTemplates()).models,
  });
}
