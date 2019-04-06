/**
 * Entry point for the end-to-end test server
 */

import config from "../core/config";
import log from "../core/log";

// Patch config for using e2e DB
log.info("Launching server with forced end-to-end configuration");

const editableConfig = config as any;
editableConfig.DB_TYPE = "sqlite3";
editableConfig.DB_SQLITE_FILENAME = "cypress/e2e.sqlite";
editableConfig.SERVER_PORT = 8001;
editableConfig.ROOT_URL = "http://localhost:8001";
editableConfig.DATA_PATH = "cypress";
editableConfig.DEBUG_ADMIN = true;

import "../index";
