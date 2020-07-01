import * as React from "preact";
import config from "server/core/config";
import { dateTime } from "server/core/templating-filters";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import adminBase, { AdminBaseContext } from "../admin.base";

export default function render(context: AdminBaseContext & { backupDate?: Date }) {
  return adminBase(context,
    <div>

      <h1>Developer tools</h1>

      <form method="post">
        {context.csrfTokenJSX()}

        <div class="form-group">
          <input type="submit" name="replace-passwords" class="btn btn-danger mr-1"
            onclick="return confirm('Replace passwords?')" value="Replace passwords" />
          Sets simple passwords to plenty of accounts to make logging as them easier.
        </div>
        <div class="form-group">
          <input type="submit" name="db-reset" class="btn btn-danger mr-1"
            onclick="return confirm('Reset the whole DB?')" value="Reset database" />
          Empties then regenerates the database, re-creating samples depending on your local config.
        </div>

        {ifTrue(config.DB_TYPE === "sqlite3", () =>
          <div>
            <div class="form-group">
              <input type="submit" name="backup" class="btn btn-danger mr-1" value="Backup database" /> Backup the database (SQLite only)
            </div>
            {ifSet(context.backupDate, () =>
              <div class="form-group">
                <input type="submit" name="restore" class="btn btn-danger mr-1" value="Restore backup" />
                <input type="submit" name="delete-backup" class="btn btn-danger mr-1" value="Delete backup" />
                Backup date: <b>{dateTime(context.backupDate)}</b>
              </div>)}
          </div>
        )}
      </form>
    </div>);
}
