import constants from "server/core/constants";
import forms from "server/core/forms";
import userService from "server/user/user.service";

/**
 * Login form
 */
export async function loginForm(req, res) {
  res.locals.pageTitle = "Login";

  res.render("user/authentication/login", {
    redirect: forms.sanitizeString(req.query.redirect),
  });
}

/**
 * Login
 */
export async function login(req, res) {
  res.locals.pageTitle = "Login";

  const context: any = {
    redirect: forms.sanitizeString(req.body.redirect),
  };
  if (req.body.name && req.body.password) {
    const user = await userService.authenticate(req.body.name, req.body.password);
    if (user) {
      context.user = user;
      context.infoMessage = "Authentication successful";

      req.session.userId = user.get("id");
      if (req.body["remember-me"]) {
        req.session.cookie.maxAge = constants.REMEMBER_ME_MAX_AGE;
      }
      await req.session.savePromisified();
    } else {
      context.errorMessage = "Authentication failed";
    }
  } else {
    context.errorMessage = "Username or password missing";
  }

  if (!context.errorMessage && context.redirect) {
    res.redirect(context.redirect);
  } else {
    res.render("user/authentication/login", context);
  }
}
