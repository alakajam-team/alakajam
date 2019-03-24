import * as findUp from "find-up";
import * as fs from "fs";
import * as path from "path";
import log from "./log";

interface Config {
  SERVER_PORT: number;
  ROOT_URL: string;
  STATIC_ROOT_URL: false|string;

  // File storage
  DATA_PATH: string;
  UPLOADS_PATH: string;

  // Database
  DB_TYPE: "sqlite3"|"postgresql";
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SQLITE_FILENAME: string;

  // Emails
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;

  // Misc
  GOOGLE_ANALYTICS_ID: string;
  SECURE_SESSION_COOKIES: boolean;

  // Debug: general options
  DEBUG_INSERT_SAMPLES: boolean;
  DEBUG_DISABLE_CACHE: boolean;
  DEBUG_REFRESH_BROWSER: boolean;
  DEBUG_ADMIN: boolean;
  DEBUG_TEST_MAILER: boolean;
  DEBUG_DISABLE_STARTUP_BUILD: boolean;
  DEBUG_ARTICLES: boolean;

  // Debug: trace options
  LOG_LEVEL: "none"|"error"|"warn"|"info"|"debug";
  DEBUG_TRACE_SQL: boolean;
  DEBUG_TRACE_SLOW_SQL: number;
  DEBUG_TRACE_REQUESTS: boolean;
  DEBUG_TRACE_SLOW_REQUESTS: number;
}

const SOURCES_ROOT = path.dirname(findUp.sync("package.json"));
const CONFIG_PATH = path.join(SOURCES_ROOT, "config.js");
const CONFIG_SAMPLE_PATH = path.join(SOURCES_ROOT, "config.sample.js");

// Create config.js if missing
if (!fs.existsSync(CONFIG_PATH)) {
  fs.copyFileSync(CONFIG_SAMPLE_PATH, CONFIG_PATH);
  log.info(CONFIG_PATH + " initialized with sample values");
}

// Look for missing config keys
// tslint:disable: no-var-requires
const config = require(CONFIG_PATH) as Config;
const configSample = require(CONFIG_SAMPLE_PATH) as Config;
// tslint:enable: no-var-requires

for (const key in configSample) {
  if (config[key] === undefined && (key !== "DB_SQLITE_FILENAME" || config.DB_TYPE === "sqlite3")) {
    log.warn('Key "' + key + '" missing from config.js, using default value "' + configSample[key] + '"');
    config[key] = configSample[key];
  }
}

export default config;
