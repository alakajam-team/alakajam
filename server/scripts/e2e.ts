/**
 * Entry point for the end-to-end test server
 */

import log from "../core/log";
log.info("Launching server with forced end-to-end configuration...");
process.env.CONFIG_PATH = "server/scripts/e2e-config.js";

import * as fs from "fs";
import * as path from "path";
import config from "../core/config";
import constants from "../core/constants";

// Initialize backup for restoration throughout tests
// XXX Should be done after DB migration
const DB_SQLITE_PATH = path.resolve(constants.ROOT_PATH, config.DB_SQLITE_FILENAME);
log.info(`Backing up DB to ${DB_SQLITE_PATH}.backup to restore its state between tests...`);
fs.copyFileSync(DB_SQLITE_PATH, DB_SQLITE_PATH + ".backup");

import "../index";
