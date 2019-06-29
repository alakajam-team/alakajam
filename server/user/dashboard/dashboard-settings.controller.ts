import constants from "server/core/constants";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import { anyRule, rule, validateObject } from "server/core/forms-validation";
import { logout } from "server/user/authentication/logout.controller";
import userService from "server/user/user.service";

export async function dashboardSettingsGet(req, res) {
  await res.locals.dashboardUser.load("details");

  res.render("user/dashboard/dashboard-settings");
}

/**
 * Manage general user info44
 */
export async function dashboardSettingsPost(req, res) {
  await res.locals.dashboardUser.load("details");

  let errorMessage = res.locals.errorMessage;

  if (req.method === "POST") {
    const dashboardUser = res.locals.dashboardUser;
    if (req.body.delete) {
      // Account deletion
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
        errorMessage = result.error;
      }
    } else {
      errorMessage = await validateObject(req.body, {
        email: anyRule([forms.isNotSet, forms.isEmail], "Invalid email"),
        website: anyRule([forms.isNotSet, forms.isURL], "Invalid URL"),
        special_permissions: anyRule([forms.isNotSet, () => res.locals.dashboardAdminMode],
          "Not allowed to change special permissions on this user"),
        disallow_anonymous: anyRule([forms.isNotSet, () => res.locals.dashboardAdminMode],
          "Not allowed to change anonymous comments settings on this user"),
        file: anyRule([forms.isNotSet, (f) => fileStorage.isValidPicture(f.path)],
          "Invalid picture format (allowed: PNG GIF JPG)")
      });

      if (!errorMessage) {
        // General settings form
        dashboardUser.set("title", forms.sanitizeString(req.body.title || dashboardUser.get("name")));
        dashboardUser.set("email", req.body.email);
        if (req.body.special_permissions) {
          const isMod = ["mod", "admin"].includes(req.body.special_permissions);
          const isAdmin = req.body.special_permissions === "admin";
          dashboardUser.set({
            is_mod: isMod ? "true" : "",
            is_admin: isAdmin ? "true" : "",
          });
        }

        if (res.locals.dashboardAdminMode) {
          dashboardUser.set("disallow_anonymous", req.body.disallow_anonymous === "on");
        }

        const dashboardUserDetails = dashboardUser.related("details");
        dashboardUserDetails.set("social_links", {
          website: req.body.website,
          twitter: forms.sanitizeString(req.body.twitter.replace("@", "")),
        });
        dashboardUserDetails.set("body", forms.sanitizeMarkdown(req.body.body,
          { maxLength: constants.MAX_BODY_USER_DETAILS }));
        await dashboardUserDetails.save();

        if (dashboardUser.hasChanged("title")) {
          await userService.refreshUserReferences(dashboardUser);
        }

        if (req.file || req.body["avatar-delete"]) {
          const avatarPath = "/user/" + dashboardUser.get("id");
          await fileStorage.savePictureToModel(dashboardUser, "avatar", req.file,
            req.body["avatar-delete"], avatarPath, { maxDiagonal: 500 });
        }

        await dashboardUser.save();
      }
    }
  }

  res.locals.errorMessage = errorMessage;

  await dashboardSettingsGet(req, res);
}
