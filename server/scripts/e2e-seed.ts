/**
 * Builds the end-to-end tests data from scratch: database schema, initial data, then the E2E seed.
 * Launched in its own process by e2e.ts, so that the server starts without any state (caches, connections) left by the seeding.
 */

import "./e2e-env";

import * as fs from "fs-extra";
import * as path from "path";
import config, * as configUtils from "../core/config";
import db from "../core/db";
import { insertInitialData } from "../core/db-init";
import dbTypeorm from "../core/db-typeorm";
import log from "../core/log";
import { createSessionStore } from "../core/middleware";
import { seedE2EData } from "../testing/e2e/e2e-seed";

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    log.error(e);
    process.exit(1);
  });

async function seed() {
  const startDate = Date.now();
  await fs.emptyDir(configUtils.dataPathAbsolute());
  await fs.mkdirp(path.dirname(path.resolve(config.DB_SQLITE_FILENAME)));

  await db.upgradeDatabase({ silent: true });
  await dbTypeorm.connect();
  await insertInitialData(false);
  await seedE2EData();
  await createSessionStore().ready; // Creates the sessions table, so that it survives DB restorations

  // Wait for pending queries before the database file gets copied
  await dbTypeorm.closeAnyConnection();
  await db.knex.destroy();
  log.info(`End-to-end data seeded in ${((Date.now() - startDate) / 1000).toFixed(1)}s`);
}
