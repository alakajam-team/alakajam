import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "../../user/user.service";

/**
 * Admin only: users management
 */
export async function adminUsers(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  if (!config.DEBUG_ADMIN && !security.isMod(res.locals.user)) {
    res.errorPage(403);
  }

  const byTitle = (user1: User, user2: User): number => (user1.title || "").localeCompare(user2.title || "");

  const unapprovedUsers = await userService.findUsers({ approbationState: "pending" });
  unapprovedUsers.sort(byTitle);

  const newUsers = await userService.findUsers({ orderBy: "created_at", orderByDesc: true, pageSize: 20 });
  newUsers.sort(byTitle);

  const modsAndAdmins = await userService.findUsers({ isMod: true });
  modsAndAdmins.sort(byTitle);

  res.render<CommonLocals>("admin/users/admin-users", {
    ...res.locals,
    newUsers,
    unapprovedUsers,
    modsAndAdmins
  });
}
