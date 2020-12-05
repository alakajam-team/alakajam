import { NextFunction } from "express";
import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";

export function adminMiddleware(req: CustomRequest, res: CustomResponse<CommonLocals>, next: NextFunction): void {
  res.locals.pageTitle = "Mod dashboard";

  if (!config.DEBUG_ADMIN && !security.isMod(res.locals.user)) {
    res.errorPage(403);
  } else {
    next();
  }
}
