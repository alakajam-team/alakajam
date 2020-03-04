import db, { DB } from "server/core/db";
import { Alert } from "server/types";
import userService from "../../user/user.service";

export class AdminDevService {

    constructor(private db: DB) { }
        
    async createBackup(): Promise<Alert> {
        if (await this.db.getBackupDate()) {
            await this.db.backup();
            return { type: "success", message: "Backup created." };
        }
        else {
            // Don't override backups (ensures stability when working on Cypress tests)
            return { type: "danger", message: "A backup already exists, please delete it first" };
        }
    }

    async deleteBackup(): Promise<Alert> {
        await this.db.deleteBackup();
        return { type: "success", message: "Backup deleted." };
    }

    async restoreBackup(sessionStore: any): Promise<Alert> {
        await this.db.restore(sessionStore);
        return { type: "success", message: "Backup restored." };
    }

    async getBackupDate(): Promise<false | Date> {
        return this.db.getBackupDate();
    }

    async resetDatabase(): Promise<Alert> {
        await this.db.emptyDatabase();
        const newVersion = await this.db.initDatabase();
        return { type: "success", message: "DB reset done (current version : " + newVersion + ")." };
    }

    async replaceSomePasswords(): Promise<Alert> {
        const users = await userService.findUsers({ pageSize: 30 });
        await this.db.transaction(async (transaction) => {
            for (const user of (users as any).models) {
                userService.setPassword(user, "password");
                await user.save(null, { transacting: transaction });
            }
        });
        return {
            type: "success",
            message: 'The last 30 created users now have their password set to "password".'
        };
    }
    
}

export default new AdminDevService(db);
