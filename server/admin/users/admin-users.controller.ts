import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "../../user/user.service";

/**
 * Admin only: users management
 */
export async function adminUsers(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  const users = await userService.findUsers();
  users.sort((user1, user2) => (user1.title || "").localeCompare(user2.title || ""));

  res.render("admin/users/admin-users", {
    users
  });
}
