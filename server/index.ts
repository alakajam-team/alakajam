// tslint:disable: ordered-imports

/**
 * Entry point for the Alakajam! server
 *
 * @description
 * Starts the Node server
 *
 * @module server
 */

const startDate = Date.now();

import config from "./core/config";
import log from "./core/log";

if (__filename.includes(".js")) {
  // Fix root-relative import paths from build
  // tslint:disable-next-line: no-var-requires
  require("module-alias/register");
}

log.warn("Starting server...");
if (config.DEBUG_TRACE_REQUESTS) {
  process.env.DEBUG = "express:*";
}

/**
 * Initial dependencies
 */

import * as express from "express";
import * as findUp from "find-up";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as path from "path";
import * as postcssWalk from "postcss-walk";
import * as util from "util";
import * as webpack from "webpack";

/**
 * Local constants
 */

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_ENV = "development";
}
const DEV_ENVIRONMENT = process.env.NODE_ENV === "development";
const ROOT_PATH = path.dirname(findUp.sync("package.json", { cwd: __dirname }));
const CSS_INDEX_SRC_FOLDER = path.join(ROOT_PATH, "./client/css/");
const CSS_INDEX_DEST_FOLDER = path.join(ROOT_PATH, "./dist/client/css/");
const CSS_PLUGINS = [
  // tslint:disable: no-var-requires
  require("postcss-import"),
  require("postcss-cssnext"),
  // tslint:enable: no-var-requires
];

/**
 * App launch!
 */

createApp();

/*
 * Create, configure and launch the server
 */
async function createApp() {
  catchErrorsAndSignals();
  await initFilesLayout();

  const middleware = require("./core/middleware").default;
  const db = require("./core/db").default;

  const app = express();
  app.disable("x-powered-by");
  if (config.SECURE_SESSION_COOKIES) {
    // See https://github.com/expressjs/session#cookiesecure
    app.set("trust proxy", 1);
  }

  app.locals.devMode = DEV_ENVIRONMENT;
  const previousVersion = await db.initDatabase();
  if (previousVersion === "none") {
    await require("./core/db-init").insertInitialData(config.DEBUG_INSERT_SAMPLES);
  }
  await middleware.configure(app);

  app.listen(config.SERVER_PORT, () => {
    const startSeconds = (Date.now() - startDate) / 1000;
    log.warn(`Server started in ${startSeconds.toFixed(1)}s: http://localhost:${config.SERVER_PORT}/`);
    if (process.send) {
      process.send("online"); // browser-refresh event
    }
  });
}

/*
 * Catch unhandled errors and system signals
 */
function catchErrorsAndSignals() {
  // Display unhandled errors more nicely
  process.on("uncaughtException", (error) => {
    log.error(`Uncaught exception: ${error.message}\n${error.stack}`);
    _doGracefulShutdown(null, 1);
  });
  process.on("unhandledRejection", (error) => {
    // tslint:disable-next-line: no-console
    log.error(`Unhandled promise rejection: ${error.message}\n${error.stack}`);
  });

  // Stop the server gracefully upon shut down signals
  let alreadyShuttingDown = false;
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGQUIT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, _doGracefulShutdown);
  });
  function _doGracefulShutdown(_: NodeJS.Signals, exitCode: number = 0) {
    if (!alreadyShuttingDown) {
      alreadyShuttingDown = true;
      const db = require("./core/db").default;
      log.info("Shutting down.");
      db.knex.destroy(() => process.exit(exitCode));
    }
  }
}

/*
 * Initialize files upon first startup
 */
async function initFilesLayout() {
  // Create data folders
  await _createFolderIfMissing(path.join(ROOT_PATH, config.DATA_PATH, "/tmp"));
  await _createFolderIfMissing(path.join(ROOT_PATH, config.UPLOADS_PATH));

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
    await buildCSS(DEV_ENVIRONMENT);
    await buildJS(DEV_ENVIRONMENT);
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

async function buildCSS(watch = false) {
  await _createFolderIfMissing(CSS_INDEX_DEST_FOLDER);
  if (watch) {
    log.info("Setting up automatic CSS build...");
  } else {
    log.info("Building CSS...");
  }

  postcssWalk({
    input: _postcssWalkPathFix(CSS_INDEX_SRC_FOLDER),
    output: _postcssWalkPathFix(CSS_INDEX_DEST_FOLDER),
    plugins: CSS_PLUGINS,
    copyAssets: ["png"],
    log: DEV_ENVIRONMENT,
    watch,
  });
}

async function buildJS(watch = false) {
  const env = process.env.NODE_ENV || "development";
  const webpackConfig = require(path.join(ROOT_PATH, "./webpack." + env + ".js"));

  await _createFolderIfMissing(webpackConfig.output.path);

  const compiler = webpack(webpackConfig);

  await new Promise((resolve) => {
    function callback(err, stats) {
      // https://webpack.js.org/api/node/#error-handling

      if (err) {
        // This means an error in webpack or its configuration, not an error in
        // the compiled sources.
        log.error(err.stack || err);
        if (err.details) {
          log.error(err.details);
        }
        return;
      }

      let logMethod = log.info.bind(log);
      if (stats.hasErrors()) {
        logMethod = log.error.bind(log);
      } else if (stats.hasWarnings()) {
        logMethod = log.warn.bind(log);
      }
      logMethod(stats.toString(webpackConfig.stats));

      resolve();
    }

    if (watch) {
      log.info("Setting up automatic JS build...");
      compiler.watch(webpackConfig.watchOptions || {}, callback);
    } else {
      log.info("Building JS...");
      compiler.run(callback);
    }
  });
}

/**
 * A postcss-walk bug converts input paths to output paths incorrectly depending on the folder syntax
 */
function _postcssWalkPathFix(anyPath) {
  return path.relative(ROOT_PATH, anyPath).replace(/\\/g, "/");
}

/**
 * Creates a folder. No-op if the folder exists.
 */
async function _createFolderIfMissing(folderPath) {
  try {
    await util.promisify(fs.access)(folderPath, fs.constants.R_OK);
  } catch (e) {
    await util.promisify(mkdirp)(folderPath);
  }
}
