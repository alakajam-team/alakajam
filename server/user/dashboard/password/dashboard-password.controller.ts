import forms from "server/core/forms";
import { anyRule, rule, validateForm } from "server/core/forms-validation";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { DashboardLocals } from "../dashboard.middleware";

export async function dashboardPasswordGet(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  res.render<DashboardLocals>("user/dashboard/password/dashboard-password", res.locals);
}
/**
 * Manage user profile contents
 */
export async function dashboardPasswordPost(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  const dashboardUser = res.locals.dashboardUser;

  const formAlerts = await validateForm(req.body, {
    "password": anyRule([
      () => res.locals.dashboardAdminMode,
      (value) => userService.authenticate(dashboardUser.name, value)
    ], "Current password is incorrect"),
    "new-password": rule(forms.isSet, "You must enter a new password"),
    "new-password-bis": rule((value) => value === req.body["new-password"], "New passwords do not match")
  });

  // Change password form
  if (!formAlerts) {
    const result = userService.setPassword(dashboardUser, req.body["new-password"]);
    if (result !== true) {
      formAlerts.push({ type: "danger", message: result });
    } else {
      await userService.save(dashboardUser);
      res.locals.alerts.push({ type: "success", message: "Password change successful" });
    }
  } else {
    res.locals.alerts.push(...formAlerts);
  }

  res.redirect(req.url);
}
