import config from "server/core/config";
import security from "server/core/security";
import { Alert, CustomRequest, CustomResponse } from "server/types";
import { AdminBaseContext } from "../admin.base";
import adminDevService from "./admin-dev.service";

/**
 * Admin only: developer tools
 */
export async function adminDev(req: CustomRequest, res: CustomResponse<AdminBaseContext>): Promise<void> {
  if (res.app.locals.devMode && (config.DEBUG_ADMIN || security.isAdmin(res.locals.user))) {

    if (req.method === "POST") {
      let alert: Alert;
      if (req.body["db-reset"]) {
        alert = await adminDevService.resetDatabase();
      } else if (req.body["replace-passwords"]) {
        alert = await adminDevService.replaceSomePasswords();
      } else if (req.body.backup) {
        alert = await adminDevService.createBackup();
      } else if (req.body.restore) {
        alert = await adminDevService.restoreBackup(res.app.locals.sessionStore);
      } else if (req.body["delete-backup"]) {
        alert = await adminDevService.deleteBackup();
      }

      if (alert) {
        res.locals.alerts.push(alert);
      }
    }

    res.render("admin/dev/admin-dev", {
      ...res.locals,
      backupDate: await adminDevService.getBackupDate() || undefined,
    });
  } else {
    res.errorPage(403, "Page only available in development mode");
  }
}
