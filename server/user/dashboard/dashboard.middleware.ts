import forms from "server/core/forms";
import security from "server/core/security";
import userService from "../user.service";

export async function dashboardMiddleware(req, res, next) {
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
