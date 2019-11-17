import { BookshelfCollection } from "bookshelf";
import config from "server/core/config";
import security from "server/core/security";
import userService from "../../user/user.service";

/**
 * Admin only: users management
 */
export async function adminUsers(req, res) {
  if (!config.DEBUG_ADMIN && !security.isAdmin(res.locals.user)) {
    res.errorPage(403);
  }

  const users = await userService.findUsers() as BookshelfCollection;
  const sortedUsers = users.sortBy((user) => user.get("title"));
  res.render("admin/users/admin-users", {
    users: sortedUsers,
  });
}
