import constants from "server/core/constants";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import { allRules, anyRule, rule, validateForm } from "server/core/forms-validation";
import { USER_APPROVATION_STATES } from "server/entity/transformer/user-approbation-state.transformer";
import entryService from "server/entry/entry.service";
import { CustomRequest, CustomResponse } from "server/types";
import { logout } from "server/user/authentication/logout.controller";
import userService from "server/user/user.service";
import userTimezoneService from "../../user-timezone.service";
import { DashboardLocals } from "../dashboard.middleware";

export async function dashboardSettingsGet(req: CustomRequest, res: CustomResponse<DashboardLocals>): Promise<void> {
  const timezones = await userTimezoneService.getAllTimeZonesAsOptions();

  res.render<DashboardLocals>("user/dashboard/settings/dashboard-settings", {
    ...res.locals,
    ...req.body,
    timezones
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

async function _handleSave(req: CustomRequest, res: CustomResponse<DashboardLocals>): Promise<void> {
  const { dashboardUser } = res.locals;
  const oldTitle = dashboardUser.title;
  const isApprovedUser = dashboardUser.approbation_state === "approved";

  // Validate changes
  const formAlerts = await validateForm(req.body, {
    email: rule(forms.isEmail, "Invalid email"),
    website: anyRule([forms.isNotSet, forms.isURL], "Account website has an invalid URL"),
    approbation_state: allRules(
      value => { if (value !== undefined && !res.locals.dashboardAdminMode) { return "Not allowed to change approbation status on this user"; } },
      value => { if (value !== undefined && !USER_APPROVATION_STATES.includes(value)) { return "Invalid approbation status"; } }
    ),
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

    // Apply form changes
    dashboardUser.title = forms.sanitizeString(req.body.title || dashboardUser.name);
    dashboardUser.email = req.body.email;
    dashboardUser.timezone = forms.sanitizeString(req.body.timezone);
    dashboardUser.details.body = forms.sanitizeMarkdown(req.body.body,
      { maxLength: constants.MAX_BODY_USER_DETAILS, noHyperlinks: !isApprovedUser });
    dashboardUser.details.social_links = {
      website: req.body.website,
      twitter: forms.sanitizeString(req.body.twitter.replace(/.*\//g /* cleanup full URLs */, "").replace("@", "")),
      twitch: forms.sanitizeString(req.body.twitch).replace(/.*\//g /* cleanup full URLs */, ""),
      youtube: forms.sanitizeString(req.body.youtube)
    };
    if (!isApprovedUser) {
      delete dashboardUser.details.social_links.youtube;
      delete dashboardUser.details.social_links.website;
    }
    if (res.locals.dashboardAdminMode) {
      dashboardUser.disallow_anonymous = req.body.disallow_anonymous === "on";
      if (req.body.approbation_state) {
        dashboardUser.approbation_state = req.body.approbation_state;
      }
      if (req.body.special_permissions) {
        const isMod = ["mod", "admin"].includes(req.body.special_permissions);
        const isAdmin = req.body.special_permissions === "admin";
        dashboardUser.is_mod = isMod ? "true" : null;
        dashboardUser.is_admin = isAdmin ? "true" : null;
      }
    }

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

async function _handleDeletion(req: CustomRequest, res: CustomResponse<DashboardLocals>): Promise<void> {
  const deletingOwnAccount = res.locals.user.get("id") === res.locals.dashboardUser.id;
  const userEntries = await entryService.findUserEntries(res.locals.dashboardUser);
  const result = await userService.deleteUser(res.locals.dashboardUser, userEntries.length);

  if (!("error" in result)) {
    if (deletingOwnAccount) {
      await logout(req, res);
    } else {
      res.redirect("/events/people");
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
