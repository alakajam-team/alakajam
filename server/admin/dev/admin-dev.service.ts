import db from "server/core/db";
import { Alert } from "server/types";
import userService from "../../user/user.service";
import log from "server/core/log";

export class AdminDevService {

  public async createBackup(): Promise<Alert> {
    if (await db.getBackupDate()) {
      await db.backup();
      return { type: "success", message: "Backup created." };
    }
    else {
      // Don't override backups (ensures stability when working on Cypress tests)
      return { type: "danger", message: "A backup already exists, please delete it first" };
    }
  }

  public async deleteBackup(): Promise<Alert> {
    await db.deleteBackup();
    return { type: "success", message: "Backup deleted." };
  }

  public async restoreBackup(sessionStore: any): Promise<Alert> {
    await db.restore(sessionStore);
    return { type: "success", message: "Backup restored." };
  }

  public async getBackupDate(): Promise<false | Date> {
    return db.getBackupDate();
  }

  public async resetDatabase(): Promise<Alert> {
    await db.emptyDatabase();
    const newVersion = await db.initDatabase();
    return { type: "success", message: "DB reset done (current version : " + newVersion + ")." };
  }

  public async replaceSomePasswords(): Promise<Alert> {
    const users = await userService.findUsers({ pageSize: 30 });
    for (const user of users) {
      userService.setPassword(user, "password");
      log.debug(user.details);
      await userService.save(user);
    }
    return {
      type: "success",
      message: 'The last 30 created users now have their password set to "password".'
    };
  }

}

export default new AdminDevService();
