import { CommonLocals } from "server/common.middleware";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";

export async function postWatch(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  const { user, post } = res.locals;

  if (user) {
    if (security.isUserWatching(user, post)) {
      await security.removeUserRight(user, post, "watch");
    } else {
      await security.addUserRight(user, post, "post", "watch");
    }
  }

  res.redirect(".");
}
