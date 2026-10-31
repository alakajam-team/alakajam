import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";

export async function postWatch(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  const { user, post } = res.locals;

  if (user) {
    if (security.isUserWatching(user, post)) {
      await security.removeUserRight(user, post, "watch");
    } else {
      await security.addUserRight(user, post, "watch");
    }
  }

  res.redirect(links.routeUrl(post, "post"));
}
