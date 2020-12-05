import { CommonLocals } from "server/common.middleware";
import { CustomRequest, CustomResponse } from "server/types";

/**
 * Logout
 */
export async function logout(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  res.locals.pageTitle = "Login";

  await req.session.regenerateAsync();

  res.render<CommonLocals>("user/authentication/login", {
    ...res.locals,
    infoMessage: "Logout successful.",
    user: null
  });
}
