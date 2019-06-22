import constants from "server/core/constants";
import security from "server/core/security";

export async function postWatch(req, res) {
  const { user, post } = res.locals;

  if (user) {
    if (security.isUserWatching(user, post)) {
      await security.removeUserRight(user, post, constants.PERMISSION_WATCH);
    } else {
      await security.addUserRight(user, post, "post", constants.PERMISSION_WATCH);
    }
  }

  res.redirect(".");
}
