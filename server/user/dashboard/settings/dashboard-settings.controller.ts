import constants from "server/core/constants";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import { anyRule, rule, validateForm } from "server/core/forms-validation";
import entryService from "server/entry/entry.service";
import { CustomRequest, CustomResponse } from "server/types";
import { logout } from "server/user/authentication/logout.controller";
import userService from "server/user/user.service";
import userTimezoneService from "../../user-timezone.service";
import { DashboardLocals } from "../dashboard.middleware";

export async function dashboardSettingsGet(req: CustomRequest, res: CustomResponse<DashboardLocals>): Promise<void> {
  res.render<DashboardLocals>("user/dashboard/settings/dashboard-settings", {
    ...res.locals,
    ...req.body,
    timezones: await userTimezoneService.getAllTimeZonesAsOptions()
  });
}

/**
 * Manage general user info
 */
export async function dashboardSettingsPost(req: CustomRequest, res: CustomResponse<DashboardLocals>): Promise<void> {
  if (req.body.delete) {
    await _handleDeletion(req, res);
  } else {
    await _handleSave(req, res);
  }
}

async function _handleSave(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  const dashboardUser = res.locals.dashboardUser;
  const oldTitle = dashboardUser.title;

  // Apply form changes
  dashboardUser.title = forms.sanitizeString(req.body.title || dashboardUser.name);
  dashboardUser.email = req.body.email;
  dashboardUser.timezone = forms.sanitizeString(req.body.timezone);
  dashboardUser.details.body = forms.sanitizeMarkdown(req.body.body, { maxLength: constants.MAX_BODY_USER_DETAILS });
  dashboardUser.details.social_links = {
    website: req.body.website,
    twitter: forms.sanitizeString(req.body.twitter.replace(/.*\//g /* cleanup full URLs */, "").replace("@", "")),
    twitch: forms.sanitizeString(req.body.twitch).replace(/.*\//g /* cleanup full URLs */, "")
  };
  if (res.locals.dashboardAdminMode) {
    dashboardUser.disallow_anonymous = req.body.disallow_anonymous === "on";
    if (req.body.special_permissions) {
      const isMod = ["mod", "admin"].includes(req.body.special_permissions);
      const isAdmin = req.body.special_permissions === "admin";
      dashboardUser.is_mod = isMod ? "true" : null;
      dashboardUser.is_admin = isAdmin ? "true" : null;
    }
  }

  // Validate changes
  const formAlerts = await validateForm(req.body, {
    email: rule(forms.isEmail, "Invalid email"),
    website: anyRule([forms.isNotSet, forms.isURL], "Account website has an invalid URL"),
    special_permissions: anyRule([forms.isNotSet, () => res.locals.dashboardAdminMode],
      "Not allowed to change special permissions on this user"),
    disallow_anonymous: anyRule([forms.isNotSet, () => res.locals.dashboardAdminMode],
      "Not allowed to change anonymous comments settings on this user"),
    file: anyRule([forms.isNotSet, (f) => fileStorage.isValidPicture(f.path)],
      "Invalid picture format (allowed: PNG GIF JPG)"),
    timezone: anyRule([forms.isNotSet, userTimezoneService.isValidTimeZone.bind(userTimezoneService)],
      "Invalid timezone")
  });

  if (!formAlerts) {
    // Persist avatar
    if (req.file || req.body["avatar-delete"]) {
      const avatarPath = "/user/" + dashboardUser.id;
      await fileStorage.savePictureToModel(dashboardUser, "avatar", req.file,
        req.body["avatar-delete"], avatarPath, { maxDiagonal: 500 });
    }

    // Save
    await userService.save(dashboardUser);

    // Hooks
    if (dashboardUser.title !== oldTitle) {
      await userService.refreshUserReferences(dashboardUser);
    }

    res.locals.alerts.push({
      type: "success",
      message: "Settings have been saved"
    });
  } else {
    res.locals.alerts.push(...formAlerts);
  }

  await dashboardSettingsGet(req, res);
}

async function _handleDeletion(req: CustomRequest, res: CustomResponse<DashboardLocals>) {
  const deletingOwnAccount = res.locals.user.get("id") === res.locals.dashboardUser.id;
  const userEntries = await entryService.findUserEntries(res.locals.dashboardUser);
  const result = await userService.deleteUser(res.locals.dashboardUser, userEntries.length);

  if (!("error" in result)) {
    if (deletingOwnAccount) {
      await logout(req, res);
    } else {
      res.redirect("/people");
    }
  } else {
    res.locals.alerts.push({
      type: "danger",
      title: "Could not delete account",
      message: result.error
    });
    await dashboardSettingsGet(req, res);
  }
}
