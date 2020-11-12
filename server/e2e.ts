/**
 * Entry point for the end-to-end test server
 */

import * as fs from "fs";
import * as path from "path";
import config, { Config } from "./core/config";
import constants from "./core/constants";
import log from "./core/log";
import { Mutable } from "./types";

// Patch config for using e2e DB
log.info("Launching server with forced end-to-end configuration...");

const editableConfig = config as Mutable<Config>;
editableConfig.DB_TYPE = "sqlite3";
editableConfig.DB_SQLITE_FILENAME = "cypress/e2e.sqlite";
editableConfig.SERVER_PORT = 8001;
editableConfig.ROOT_URL = "http://localhost:8001";
editableConfig.DATA_PATH = "cypress";
editableConfig.DEBUG_ADMIN = true;
editableConfig.DEBUG_DISABLE_STARTUP_BUILD = true;
editableConfig.DEBUG_DISABLE_SLOW_DOWN = true;

// Initialize backup for restoration throughout tests
// XXX Should be done after DB migration
const DB_SQLITE_PATH = path.resolve(constants.ROOT_PATH, editableConfig.DB_SQLITE_FILENAME);
log.info(`Backing up DB to ${DB_SQLITE_PATH}.backup to restore its state between tests...`);
fs.copyFileSync(DB_SQLITE_PATH, DB_SQLITE_PATH + ".backup");

import "./index";

