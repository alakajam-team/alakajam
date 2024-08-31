import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { AdminBaseContext } from "../admin.base";

export interface AdminMarketingContext extends AdminBaseContext {
  notifiableUsers: User[];
}

export async function adminNotification(_req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const { user } = res.locals;

  if (!config.DEBUG_ADMIN && !security.isAdmin(user)) {
    res.errorPage(403);
  }

  const notifiableUsers = await userService.findUsers({
    userMarketingEnabled: true,
    withMarketing: true
  });

  res.render<AdminMarketingContext>("admin/marketing/admin-marketing", {
    ...res.locals,
    notifiableUsers
  });
}
