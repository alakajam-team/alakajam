import db from "server/core/db";
import { insertInitialData } from "server/core/db-init";
import dbTypeorm from "server/core/db-typeorm";

export const startTestDB = async () => {
  require("server/testing/testing-db-config");
  await db.initDatabase({ silent: true });
  await dbTypeorm.connect({ silent: true });
  await insertInitialData(false);
};

export const closeTestDB = async () => {
  await dbTypeorm.closeAnyConnection();
  await db.emptyDatabase();
};
