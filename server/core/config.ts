import * as findUp from "find-up";
import * as fs from "fs";
import * as path from "path";
import log from "./log";

const ROOT_PATH = path.dirname(findUp.sync("package.json", { cwd: __dirname }));

export interface Config {
  readonly SERVER_PORT: number;
  readonly ROOT_URL: string;
  readonly STATIC_ROOT_URL: false|string;

  // File storage
  readonly DATA_PATH: string;

  // Database
  readonly DB_TYPE: "sqlite3"|"postgresql";
  readonly DB_HOST: string;
  readonly DB_USER: string;
  readonly DB_PASSWORD: string;
  readonly DB_NAME: string;
  readonly DB_SQLITE_FILENAME?: string;

  // Emails
  readonly SMTP_HOST: string;
  readonly SMTP_PORT: number;
  readonly SMTP_USERNAME: string;
  readonly SMTP_PASSWORD: string;

  // Misc
  readonly SECURE_SESSION_COOKIES: boolean;

  // Debug: general options
  readonly DEBUG_INSERT_SAMPLES: boolean;
  readonly DEBUG_DISABLE_CACHE: boolean;
  readonly DEBUG_REFRESH_BROWSER: boolean;
  readonly DEBUG_ADMIN: boolean;
  readonly DEBUG_TEST_MAILER: boolean;
  readonly DEBUG_DISABLE_STARTUP_BUILD: boolean;
  readonly DEBUG_ARTICLES: boolean;
  readonly DEBUG_LONG_PROMISE_TRACES: boolean;

  // Debug: trace options
  readonly LOG_LEVEL: "none"|"error"|"warn"|"info"|"debug";
  readonly DEBUG_TRACE_SQL: boolean;
  readonly DEBUG_TRACE_SLOW_SQL: number;
  readonly DEBUG_TRACE_REQUESTS: boolean;
  readonly DEBUG_TRACE_SLOW_REQUESTS: number;
}

const SOURCES_ROOT = path.dirname(findUp.sync("package.json", { cwd: __dirname }));
const CONFIG_PATH = path.join(SOURCES_ROOT, "config.js");
const CONFIG_SAMPLE_PATH = path.join(SOURCES_ROOT, "config.sample.js");

// Create config.js if missing
if (!fs.existsSync(CONFIG_PATH)) {
  fs.copyFileSync(CONFIG_SAMPLE_PATH, CONFIG_PATH);
  log.info(CONFIG_PATH + " initialized with sample values");
}

// Look for missing config keys
const config = require(CONFIG_PATH) as Config;
const configSample = require(CONFIG_SAMPLE_PATH) as Config;

for (const key in configSample) {
  if (config[key] === undefined && (key !== "DB_SQLITE_FILENAME" || config.DB_TYPE === "sqlite3")) {
    log.warn('Key "' + key + '" missing from config.js, using default value "' + configSample[key] + '"');
    config[key] = configSample[key];
  }
}

export default config;

/**
 * Root data path
 */
export function dataPathAbsolute() {
  return path.resolve(ROOT_PATH, config.DATA_PATH);
}

/**
 * User uploads storage folder
 */
export function uploadsPathAbsolute() {
  return path.join(dataPathAbsolute(), "uploads");
}

/**
 * Temporary files folder
 */
export function tmpPathAbsolute() {
  return path.join(dataPathAbsolute(), "tmp");
}

/**
 * Static files, output of the client build
 */
export function clientBuildPathAbsolute() {
  return path.join(ROOT_PATH, "/dist/client");
}

/**
 * Static files, non-build (images, etc.)
 */
export function staticPathAbsolute() {
  return path.join(ROOT_PATH, "/static");
}

export function ilikeOperator() {
  return config.DB_TYPE === "sqlite3" ? "like" : "ilike";
}
