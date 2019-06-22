import userService from "server/user/user.service";

/**
 * Manage user profile contents
 */
export async function dashboardPassword(req, res) {
  let errorMessage = "";
  let infoMessage = "";

  if (req.method === "POST") {
    const dashboardUser = res.locals.dashboardUser;

    // Change password form
    if (!res.locals.dashboardAdminMode && !req.body.password) {
      errorMessage = "You must enter your current password";
    } else if (!res.locals.dashboardAdminMode
        && !await userService.authenticate(dashboardUser.get("name"), req.body.password)) {
      errorMessage = "Current password is incorrect";
    } else if (!req.body["new-password"]) {
      errorMessage = "You must enter a new password";
    } else if (req.body["new-password"] !== req.body["new-password-bis"]) {
      errorMessage = "New passwords do not match";
    } else {
      const result = userService.setPassword(dashboardUser, req.body["new-password"]);
      if (result !== true) {
        errorMessage = result;
      } else {
        await dashboardUser.save();
        infoMessage = "Password change successful";
      }
    }
  }

  res.render("user/dashboard/dashboard-password", {
    errorMessage,
    infoMessage,
  });
}
