import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import constants from "server/core/constants";
import forms from "server/core/forms";
import { Alert, CustomRequest, CustomResponse, RenderContext } from "server/types";
import userService from "server/user/user.service";

/**
 * Login form
 */
export function loginGet(req: CustomRequest, res: CustomResponse<CommonLocals>): void {
  res.locals.pageTitle = "Login";

  res.render<CommonLocals>("user/authentication/login", {
    ...res.locals,
    redirect: forms.sanitizeString(req.query.redirect?.toString()),
  });
}

/**
 * Login
 */
export async function loginPost(req: CustomRequest, res: CustomResponse<CommonLocals>): Promise<void> {
  res.locals.pageTitle = "Login";

  const context: RenderContext = {
    redirect: forms.sanitizeString(req.body.redirect),
  };
  const errors: Alert[] = [];

  if (req.body.name && req.body.password) {
    const user = await userService.authenticate(req.body.name, req.body.password);
    if (user) {
      if (!config.READ_ONLY_MODE || user.is_admin) {
        context.user = user;
        req.session.userId = user.get("id");
        if (req.body["remember-me"]) {
          req.session.cookie.maxAge = constants.REMEMBER_ME_MAX_AGE;
        }
        await req.session.saveAsync();
      } else {
        errors.push({ type: "danger", message: "The website is temporarily in read-only mode. "
          + "Logging in is disabled, sorry for the inconvenience." });
      }
    } else {
      errors.push({ type: "danger", message: "Authentication failed. Please try again or reset your password." });
    }
  } else {
    errors.push({ type: "danger", message: "Username or password missing" });
  }

  if (errors.length === 0 && context.redirect) {
    res.locals.alerts.push({
      type: "success",
      message: "Login successful",
      floating: true
    });
    res.redirect(context.redirect);
  } else {
    res.locals.alerts.push(...errors);
    res.render<CommonLocals>("user/authentication/login", {
      ...res.locals,
      ...context
    });
  }
}
