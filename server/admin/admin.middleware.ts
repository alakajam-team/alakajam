import { NextFunction, Request } from "express";
import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import security from "server/core/security";
import { CustomResponse } from "server/types";

export async function adminMiddleware(req: Request, res: CustomResponse<CommonLocals>, next: NextFunction) {
  res.locals.pageTitle = "Mod dashboard";

  if (!config.DEBUG_ADMIN && !security.isMod(res.locals.user)) {
    res.errorPage(403);
  } else {
    next();
  }
}
