import { Model } from "bookshelf";
import { Request } from "express";
import constants from "server/core/constants";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import { anyRule, validateObject } from "server/core/forms-validation";
import { CustomResponse } from "server/types";
import { logout } from "server/user/authentication/logout.controller";
import userService from "server/user/user.service";
import { DashboardLocals } from "./dashboard.middleware";

export async function dashboardSettingsGet(req: Request, res: CustomResponse<DashboardLocals>) {
  await res.locals.dashboardUser.load("details");

  res.render("user/dashboard/dashboard-settings");
}

/**
 * Manage general user info
 */
export async function dashboardSettingsPost(req: Request, res: CustomResponse<DashboardLocals>) {
  await res.locals.dashboardUser.load("details");

  if (req.body.delete) {
    await _handleDeletion(req, res);
  } else {
    await _handleSave(req, res);
  }

  await dashboardSettingsGet(req, res);
}

async function _handleSave(req: Request, res: CustomResponse<DashboardLocals>) {
  res.locals.errorMessage = await validateObject(req.body, {
    email: anyRule([forms.isNotSet, forms.isEmail], "Invalid email"),
    website: anyRule([forms.isNotSet, forms.isURL], "Invalid URL"),
    special_permissions: anyRule([forms.isNotSet, () => res.locals.dashboardAdminMode],
      "Not allowed to change special permissions on this user"),
    disallow_anonymous: anyRule([forms.isNotSet, () => res.locals.dashboardAdminMode],
      "Not allowed to change anonymous comments settings on this user"),
    file: anyRule([forms.isNotSet, (f) => fileStorage.isValidPicture(f.path)],
      "Invalid picture format (allowed: PNG GIF JPG)")
  });

  if (!res.locals.errorMessage) {
    const dashboardUser = res.locals.dashboardUser as Model<any>;

    // Admin mode
    if (res.locals.dashboardAdminMode) {
      dashboardUser.set("disallow_anonymous", req.body.disallow_anonymous === "on");
      if (req.body.special_permissions) {
        const isMod = ["mod", "admin"].includes(req.body.special_permissions);
        const isAdmin = req.body.special_permissions === "admin";
        dashboardUser.set({
          is_mod: isMod ? "true" : "",
          is_admin: isAdmin ? "true" : "",
        });
      }
    }

    // Save account info + bio
    const dashboardUserDetails = dashboardUser.related("details") as Model<any>;
    dashboardUser.set({
      title: forms.sanitizeString(req.body.title || dashboardUser.get("name")),
      email: req.body.email
    });
    dashboardUserDetails.set({
      social_links: {
        website: req.body.website,
        twitter: forms.sanitizeString(req.body.twitter.replace("@", "")),
      },
      body: forms.sanitizeMarkdown(req.body.body, { maxLength: constants.MAX_BODY_USER_DETAILS })
    });

    // Save avatar
    if (req.file || req.body["avatar-delete"]) {
      const avatarPath = "/user/" + dashboardUser.get("id");
      await fileStorage.savePictureToModel(dashboardUser, "avatar", req.file,
        req.body["avatar-delete"], avatarPath, { maxDiagonal: 500 });
    }

    // Hooks
    if (dashboardUser.hasChanged("title")) {
      await userService.refreshUserReferences(dashboardUser);
    }

    await dashboardUser.save();
    await dashboardUserDetails.save();
  }
}

async function _handleDeletion(req: Request, res: CustomResponse<DashboardLocals>) {
  const deletingOwnAccount = res.locals.user.get("id") === res.locals.dashboardUser.get("id");
  const result = await userService.deleteUser(res.locals.dashboardUser);
  if (!result.error) {
    if (deletingOwnAccount) {
      logout(req, res);
    } else {
      res.redirect("/people");
    }
    return;
  } else {
    res.locals.errorMessage = result.error;
  }
}
