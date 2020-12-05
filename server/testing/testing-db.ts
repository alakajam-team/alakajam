import { mkdirpSync } from "fs-extra";
import * as path from "path";
import config from "server/core/config";
import db from "server/core/db";
import { insertInitialData } from "server/core/db-init";
import dbTypeorm from "server/core/db-typeorm";

export const DB_TEST_TIMEOUT = 5000;

export const startTestDB = async (): Promise<void> => {
  require("server/testing/testing-db-config");
  mkdirpSync(path.dirname(config.DB_SQLITE_FILENAME));

  await db.emptyDatabase(); // Abort initial connection as it uses the default config due to module loading
  await db.upgradeDatabase({ silent: true });
  await dbTypeorm.connect({ logging: false });
  await insertInitialData(false);
};

export const closeTestDB = async (): Promise<void> => {
  await dbTypeorm.closeAnyConnection();
  await db.emptyDatabase();
};
