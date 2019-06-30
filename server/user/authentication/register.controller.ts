import forms from "server/core/forms";
import userService from "server/user/user.service";
import { loginPost } from "./login.controller";

/**
 * Register form
 */
export async function registerForm(req, res) {
  res.locals.pageTitle = "Register";
  res.render("user/authentication/register");
}

/**
 * Register
 */
export async function register(req, res) {
  res.locals.pageTitle = "Register";

  let errorMessage = null;
  if (!(req.body.name && req.body.password && req.body.email)) {
    errorMessage = "A field is missing";
  } else if (!forms.isUsername(req.body.name)) {
    errorMessage = "Your usename is too weird (either too short,"
      + "or has special chars other than '_' or '-', or starts with a number)";
  } else if (req.body.password !== req.body["password-bis"]) {
    errorMessage = "Passwords do not match";
  } else if (!req.body.captcha || req.body.captcha.trim().toLowerCase()[0] !== "y") {
    errorMessage = "You didn't pass the human test!";
  } else {
    const result = await userService.register(req.body.email, req.body.name, req.body.password);
    if (typeof result === "string") {
      errorMessage = result;
    } else {
      loginPost(req, res);
    }
  }

  if (errorMessage) {
    req.body.errorMessage = errorMessage;
    res.render("user/authentication/register", req.body);
  }
}
