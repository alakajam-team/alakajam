/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Entry point for the Alakajam! server
 */

const startDate = Date.now();

import config, * as configUtils from "./core/config";
import log from "./core/log";

if (__filename.includes(".js")) {
  // Fix root-relative import paths from build

  require("module-alias/register");
}


log.warn("Starting server...");
if (config.DEBUG_LONG_PROMISE_TRACES) {

  require("longjohn");
}

/**
 * Initial dependencies
 */

import express from "express";
import * as fs from "fs-extra";
import mkdirp from "mkdirp";
import * as path from "path";

/**
 * Local constants
 */

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_ENV = "development";
}
const DEV_ENVIRONMENT = process.env.NODE_ENV === "development";

/**
 * App launch!
 */

decreaseProcessPriority();
createApp();

/*
 * Create, configure and launch the server
 */
function createApp() {
  (async () => {
    catchErrorsAndSignals();
    await initFilesLayout();

    const middleware = require("./core/middleware");
    const db = require("./core/db").default;

    const app = express();
    app.disable("x-powered-by");

    // Detect IP correctly behind proxy (must be in localhost)
    // Required for secure cookies too, see https://github.com/expressjs/session#cookiesecure
    app.set("trust proxy", "loopback");

    app.locals.devMode = DEV_ENVIRONMENT;
    const previousVersion = await db.upgradeDatabase();
    await require("./core/db-typeorm").default.connect();
    if (previousVersion === "none") {
      await require("./core/db-init").insertInitialData(config.DEBUG_INSERT_SAMPLES);
    }
    await middleware.configure(app);

    app.listen(config.SERVER_PORT, () => {
      const startSeconds = (Date.now() - startDate) / 1000;
      const advertisedUrls = ["http://localhost:" + config.SERVER_PORT];
      if (config.ROOT_URL && config.ROOT_URL !== advertisedUrls[0]) {
        advertisedUrls.push(config.ROOT_URL);
      }

      log.info(`Server started in ${startSeconds.toFixed(1)}s: ${advertisedUrls.join(" or ")}`);
    });
  })().catch(e => log.error(e));
}

/*
 * Catch unhandled errors and system signals
 */
function catchErrorsAndSignals() {
  // Display unhandled errors more nicely
  process.on("uncaughtException", (error: Error) => {
    log.error(`Uncaught exception: ${error.message}\n${error.stack}`);
    _doGracefulShutdown(null, 1);
  });
  process.on("unhandledRejection", (error: any) => {
    log.error(`Unhandled promise rejection: ${error.message}\n${error.stack}`);
  });

  // Stop the server gracefully upon shut down signals
  let alreadyShuttingDown = false;
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGQUIT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, _doGracefulShutdown);
  });
  function _doGracefulShutdown(_: NodeJS.Signals, exitCode = 0) {
    if (!alreadyShuttingDown) {
      alreadyShuttingDown = true;
      const db = require("./core/db").default;
      log.info("Shutting down.");
      db.knex.destroy(() => process.exit(exitCode));
    } else {
      log.warn("Forcing process exit.");
      process.exit(exitCode);
    }
  }
}

/*
 * Initialize files upon first startup
 */
async function initFilesLayout() {
  // Create data folders
  await _createFolderIfMissing(configUtils.tmpPathAbsolute());
  await _createFolderIfMissing(configUtils.uploadsPathAbsolute());

  // Check that client assets have been built (the server never builds them itself)
  _warnIfClientBuildMissing();
}

/*
 * Client assets are built by separate processes (see the `build` & `dev` npm scripts)
 */
function _warnIfClientBuildMissing() {
  const clientBuildPath = configUtils.clientBuildPathAbsolute();
  const missingFiles = ["scripts/site.js", "css/index.css"]
    .filter((file) => !fs.existsSync(path.join(clientBuildPath, file)));
  if (missingFiles.length > 0) {
    const advice = DEV_ENVIRONMENT
      ? "use `npm run dev` to build them automatically, or run `npm run build`"
      : "run `npm run build`";
    log.warn(`Client assets missing from ${clientBuildPath} (${missingFiles.join(", ")}): ${advice}`);
  }
}

/**
 * Creates a folder. No-op if the folder exists.
 */
async function _createFolderIfMissing(folderPath) {
  try {
    await fs.access(folderPath, fs.constants.R_OK);
  } catch (e) {
    await mkdirp(folderPath);
  }
}

function decreaseProcessPriority() {
  if (process.platform === "linux") {
    try {
      const spawn = require("child_process").spawn;
      const priority = 10;
      const proc = spawn("renice", [priority, process.pid]);
      proc.on("exit", (code) => {
        if (code !== 0) {
          log.info("Process exec failed with code - " + code);
        }
      });
      proc.stdout.on("data", (data) => {
        log.info("Renice stdout: " + data);
      });
      proc.stderr.on("data", (data) => {
        log.info("Renice stderr: " + data);
      });
    } catch (e) {
      log.warn("Failed to decrease process priority with renice: " + e.message);
    }
  }
}
