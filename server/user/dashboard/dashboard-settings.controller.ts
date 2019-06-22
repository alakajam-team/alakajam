import constants from "server/core/constants";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import userService from "server/user/user.service";
import { logout } from "../authentication/logout.controller";

/**
 * Manage general user info
 */
export async function dashboardSettings(req, res) {
  await res.locals.dashboardUser.load("details");

  let errorMessage = res.locals.errorMessage;
  const infoMessage = "";

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
      if (!forms.isEmail(req.body.email)) {
        errorMessage = "Invalid email";
      } else if (req.body.social_web && !forms.isURL(req.body.social_web)) {
        errorMessage = "Invalid URL";
      } else if (!res.locals.dashboardAdminMode && req.body["special-permissions"]) {
        errorMessage = "Not allowed to change special permissions on this user";
      } else if (!res.locals.dashboardAdminMode && req.body["disallow-anonymous"]) {
        errorMessage = "Not allows to change anonymous comments settings on this user";
      } else if (req.file && !(await fileStorage.isValidPicture(req.file.path))) {
        errorMessage = "Invalid picture format (allowed: PNG GIF JPG)";
      }

      if (!errorMessage) {
        // General settings form
        dashboardUser.set("title", forms.sanitizeString(req.body.title || dashboardUser.get("name")));
        dashboardUser.set("email", req.body.email);
        if (req.body["special-permissions"]) {
          const isMod = req.body["special-permissions"] === "mod" || req.body["special-permissions"] === "admin";
          const isAdmin = req.body["special-permissions"] === "admin";
          dashboardUser.set({
            is_mod: isMod ? "true" : "",
            is_admin: isAdmin ? "true" : "",
          });
        }

        if (res.locals.dashboardAdminMode) {
          dashboardUser.set("disallow_anonymous", req.body["disallow-anonymous"] === "on");
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

  res.render("user/dashboard/dashboard-settings", {
    errorMessage,
    infoMessage,
  });
}
