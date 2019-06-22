import config from "server/core/config";
import security from "server/core/security";

export async function adminMiddleware(req, res, next) {
  res.locals.pageTitle = "Mod dashboard";

  if (!config.DEBUG_ADMIN && !security.isMod(res.locals.user)) {
    res.errorPage(403);
  } else {
    next();
  }
}
