import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import db from "server/core/db";
import security from "server/core/security";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "../../user/user.service";

/**
 * Admin only: developer tools
 */
export async function adminDev(req: CustomRequest, res: CustomResponse<CommonLocals>) {
  if (res.app.locals.devMode && (config.DEBUG_ADMIN || security.isAdmin(res.locals.user))) {
    let infoMessage = "";
    let errorMessage = "";
    if (req.method === "POST") {
      if (req.body["db-reset"]) {
        await db.emptyDatabase();
        const newVersion = await db.initDatabase();
        infoMessage = "DB reset done (current version : " + newVersion + ").";
      } else if (req.body["replace-passwords"]) {
        const users = await userService.findUsers({ pageSize: 30 });
        await db.transaction(async (transaction) => {
          for (const user of (users as any).models) {
            userService.setPassword(user, "password");
            await user.save(null, { transacting: transaction });
          }
        });
        infoMessage = 'The last 30 created users now have their password set to "password".';
      } else if (req.body.backup) {
        if (db.getBackupDate()) {
          await db.backup();
          infoMessage = "Backup created.";
        } else {
          // Don't override backups (ensures stability when working on Cypress tests)
          errorMessage = "A backup already exists, please delete it first";
        }
      } else if (req.body.restore) {
        console.log("restoer!!!!");
        await db.restore(res.app.locals.sessionStore);
        infoMessage = "Backup restored.";
      } else if (req.body["delete-backup"]) {
        await db.deleteBackup();
        infoMessage = "Backup deleted.";
      }
    }
    res.render("admin/dev/admin-dev", {
      infoMessage,
      errorMessage,
      backupDate: await db.getBackupDate()
    });
  } else {
    res.errorPage(403, "Page only available in development mode");
  }
}
