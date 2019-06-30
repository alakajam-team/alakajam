import { Request } from "express";
import { GlobalLocals } from "server/global.middleware";
import { CustomResponse } from "server/types";

/**
 * Logout
 */
export async function logout(req: Request, res: CustomResponse<GlobalLocals>) {
  res.locals.pageTitle = "Login";

  await req.session.regenerateAsync();

  res.render("user/authentication/login", {
    infoMessage: "Logout successful.",
    user: null
  });
}
