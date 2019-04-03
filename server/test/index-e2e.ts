/**
 * Entry point for the end-to-end test server
 */

import config from "../core/config";
import log from "../core/log";

// Patch config for using e2e DB
log.info("Launching server with forced end-to-end configuration");
config.DB_TYPE = "sqlite3";
config.DB_SQLITE_FILENAME = "cypress/e2e.sqlite";
config.SERVER_PORT = 8001;
config.ROOT_URL = "http://localhost:8001";
config.UPLOADS_PATH = "cypress/uploads";

import "../index";
