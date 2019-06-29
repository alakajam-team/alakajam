import { Model } from "bookshelf";
import { NextFunction, Request } from "express";
import forms from "server/core/forms";
import security from "server/core/security";
import { GlobalLocals } from "server/global.middleware";
import { CustomResponse } from "server/types";
import userService from "../user.service";

export interface DashboardLocals extends GlobalLocals {
  /**
   * The model of the currently edited user.
   * Usually identical to `user`, but moderators and admins can edit other users than themselves.
   */
  readonly dashboardUser: Model<any>;

  /**
   * Whether the dashboard is being viewed as a mod/admin (browsing someone else than themselves).
   */
  readonly dashboardAdminMode: boolean;
}

export async function dashboardMiddleware(req: Request, res: CustomResponse<GlobalLocals>, next: NextFunction) {

  res.locals.pageTitle = "User dashboard";

  if (!res.locals.user || res.locals.user === undefined) {
    res.errorPage(403, "You are not logged in.");
  } else {
    if (req.query.user && security.isAdmin(res.locals.user) &&
        req.query.user !== res.locals.user.get("name")) {
      res.locals.dashboardUser = await userService.findByName(forms.sanitizeString(req.query.user));
      res.locals.dashboardAdminMode = true;
    } else {
      res.locals.dashboardUser = res.locals.user;
    }
    next();
  }
}
