import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import forms from "server/core/forms";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { CustomRequest, CustomResponse } from "server/types";
import { AdminBaseContext } from "../admin.base";
import marketingService, { MarketingService } from "./marketing.service";

export interface AdminMarketingContext extends AdminBaseContext {
  notifiableUsers: User[];
}

export async function adminMarketing(_req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const { user } = res.locals;

  if (!config.DEBUG_ADMIN && !security.isAdmin(user)) {
    res.errorPage(403);
  }

  const notifiableUsers = await marketingService.findNotifiableUsers();

  res.render<AdminMarketingContext>("admin/marketing/admin-marketing", {
    ...res.locals,
    notifiableUsers,
    sendgridCSVPages: marketingService.getSendgridCSVPageCount(notifiableUsers.length),
    sendgridContactLimit: MarketingService.SENDGRID_CONTACT_LIMIT,
  });
}

export async function adminMarketingDownloadSendgridCsv(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const page = forms.parseInt(req.query.page, 0);

  res.contentType("text/csv");
  res.header("Content-Disposition", `attachment; filename=alakajam-marketing-${page}.csv`);
  res.end(await marketingService.generateSendgridCSV(page));
}
