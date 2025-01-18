import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { CustomRequest, CustomResponse } from "server/types";
import { AdminBaseContext } from "../admin.base";
import marketingService from "./marketing.service";

export interface AdminMarketingContext extends AdminBaseContext {
  notifiableUsers: User[];
}

export async function adminMarketing(_req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const { user } = res.locals;

  if (!config.DEBUG_ADMIN && !security.isAdmin(user)) {
    res.errorPage(403);
  }

  res.render<AdminMarketingContext>("admin/marketing/admin-marketing", {
    ...res.locals,
    notifiableUsers: await marketingService.findNotifiableUsers()
  });
}

export async function adminMarketingDownloadSendgridCsv(_req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  res.contentType("text/csv");
  res.header("Content-Disposition", "attachment; filename=alakajam-marketing.csv");
  res.end(await marketingService.generateSendgridCSV());
}
