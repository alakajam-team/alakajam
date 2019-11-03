import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * Logout
 */
export async function logout(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  res.locals.pageTitle = "Login";

  await req.session.regenerateAsync();

  res.render("user/authentication/login", {
    infoMessage: "Logout successful.",
    user: null
  });
}
