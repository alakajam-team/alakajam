/**
 * Entry point for the end-to-end test server
 */

import "./e2e-env";

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import config from "../core/config";
import constants from "../core/constants";
import log from "../core/log";

log.info("Launching server with forced end-to-end configuration...");

// Seed the data from scratch, in a separate process (see e2e-seed.ts)
const seedScript = path.join(__dirname, "e2e-seed" + path.extname(__filename));
const seeding = spawnSync(process.execPath, [...process.execArgv, seedScript], { stdio: "inherit" });
if (seeding.status !== 0) {
  log.error("Failed to seed the end-to-end data");
  process.exit(1);
}

// Initialize backup for restoration throughout tests
const DB_SQLITE_PATH = path.resolve(constants.ROOT_PATH, config.DB_SQLITE_FILENAME);
log.info(`Backing up DB to ${DB_SQLITE_PATH}.backup to restore its state between tests...`);
fs.copyFileSync(DB_SQLITE_PATH, DB_SQLITE_PATH + ".backup");

// Launch the server only now (a static import would be evaluated before the backup)
require("../index"); // eslint-disable-line @typescript-eslint/no-require-imports
