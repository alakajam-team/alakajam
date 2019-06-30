import forms from "server/core/forms";
import { anyRule, rule, validateObject } from "server/core/forms-validation";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { DashboardLocals } from "./dashboard.middleware";

export async function dashboardPasswordGet(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  res.render("user/dashboard/dashboard-password");
}
/**
 * Manage user profile contents
 */
export async function dashboardPasswordPost(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  const dashboardUser = res.locals.dashboardUser;

  let errorMessage = await validateObject(req.body, {
    "password": anyRule([
      () => res.locals.dashboardAdminMode,
      (value) => userService.authenticate(dashboardUser.name, value)
    ], "Current password is incorrect"),
    "new-password": rule(forms.isSet, "You must enter a new password"),
    "new-password-bis": rule((value) => value === req.body["new-password"], "New passwords do not match")
  });

  // Change password form
  if (!errorMessage) {
    const result = userService.setPassword(dashboardUser, req.body["new-password"]);
    if (result !== true) {
      errorMessage = result;
    } else {
      await userService.save(dashboardUser);
      res.locals.notifications.push({ type: "success", message: "Password change successful" });
    }
  }

  if (errorMessage) {
    res.locals.notifications.push({ type: "danger", message: errorMessage });
  }

  res.redirect(req.url);
}
