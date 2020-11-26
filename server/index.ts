/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Entry point for the Alakajam! server
 */

const startDate = Date.now();

import config, * as configUtils from "./core/config";
import log from "./core/log";

if (__filename.includes(".js")) {
  // Fix root-relative import paths from build
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}


log.warn("Starting server...");
if (config.DEBUG_LONG_PROMISE_TRACES) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("longjohn");
}

/**
 * Initial dependencies
 */

import express from "express";
import * as findUp from "find-up";
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
const ROOT_PATH = path.dirname(findUp.sync("package.json", { cwd: __dirname }));

/**
 * App launch!
 */

decreaseProcessPriority();
heapDumpOnSigpipe();
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

      if (process.send) {
        process.send("online"); // browser-refresh event
      }
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

  // Configure browser-refresh
  try {
    configureBrowserRefresh();
  } catch (e) {
    if (DEV_ENVIRONMENT) {
      log.error(e.message);
    }
  }

  // Run CSS and JS build (or bootstrap sources watcher in dev mode)
  if (!config.DEBUG_DISABLE_STARTUP_BUILD) {
    process.chdir(ROOT_PATH);
    await Promise.all([
      require("./sass").default.initialize({ watch: DEV_ENVIRONMENT }),
      require("./webpack").default.initialize({ watch: DEV_ENVIRONMENT })
    ]);
  }
}

/*
 * Use browser-refresh to refresh the browser automatically during development
 */
function configureBrowserRefresh() {
  const browserRefreshClient = require("browser-refresh-client");

  const CLIENT_RESOURCES = "*.html *.js *.css *.png *.jpg *.gif";

  // Configure for client-side resources
  if (config.DEBUG_REFRESH_BROWSER) {
    browserRefreshClient
      .enableSpecialReload(CLIENT_RESOURCES)
      .onFileModified(async (filePath) => {
        if (filePath.endsWith(".css")) {
          browserRefreshClient.refreshStyles();
        } else if (filePath.endsWith(".gif") || filePath.endsWith(".jpg") || filePath.endsWith(".png")) {
          browserRefreshClient.refreshImages();
        } else {
          browserRefreshClient.refreshPage();
        }
      });
  } else {
    browserRefreshClient
      .enableSpecialReload(CLIENT_RESOURCES, { autoRefresh: false });
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

function heapDumpOnSigpipe() { // kill -13
  process.on("SIGPIPE", () => {
    const heapdump = require("heapdump");
    heapdump.writeSnapshot(path.resolve(__dirname, `${Date.now()}.heapsnapshot`));
    heapdump.writeSnapshot((err, filename) => {
      log.info(`Heap dump written to ${filename}`);
    });
  });
}
