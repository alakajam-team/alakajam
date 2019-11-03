/**
 * Server middleware configuration.
 *
 * @description Sets up:
 * - Static file serving (CSS/JS/images)
 * - Templating (nunjucks)
 * - Form parsing / file upload (formidable)
 * - Error pages
 *
 * @module core/middleware
 */

import * as bodyParser from "body-parser";
import * as connectSessionKnex from "connect-session-knex";
import * as cookies from "cookies";
import * as express from "express";
import * as expressSession from "express-session";
import * as nunjucks from "nunjucks";
import * as path from "path";
import * as randomKey from "random-key";
import settings from "server/core/settings";
import { createErrorRenderingMiddleware, errorPage } from "server/error.middleware";
import { routes } from "server/routes";
import { CustomRequest } from "server/types";
import userService from "server/user/user.service";
import { promisify } from "util";
import config, * as configUtils from "./config";
import constants from "./constants";
import db from "./db";
import fileStorage from "./file-storage";
import log from "./log";
import * as templatingFilters from "./templating-filters";
import * as templatingGlobals from "./templating-globals";

const LAUNCH_TIME = new Date().getTime();

export default {
  configure,
};

/*
 * Setup app middleware
 */
async function configure(app: express.Application) {
  app.locals.config = config;

  // Slow requests logging
  if (config.DEBUG_TRACE_SLOW_REQUESTS > -1) {
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      const start = Date.now();
      res.once("finish", () => {
        const totalTime = Date.now() - start;
        if (totalTime > config.DEBUG_TRACE_SLOW_REQUESTS) {
          log.debug(req.url + " " + totalTime + "ms");
        }
      });
      next();
    });
  }

  // In-memory data
  await userService.loadPasswordRecoveryCache(app);

  // Static files
  app.use("/static", express.static(configUtils.staticPathAbsolute()));
  app.use("/dist/client", express.static(configUtils.clientBuildPathAbsolute()));
  app.use("/data/uploads", express.static(configUtils.uploadsPathAbsolute()));

  // Session management
  const sessionKey = await findOrCreateSessionKey();
  app.use(cookies.express([sessionKey]));
  app.locals.sessionStore = createSessionStore();
  app.use(await createSessionMiddleware(app.locals.sessionStore));

  // Templating
  app.set("views", path.join(constants.ROOT_PATH, "/server"));
  const njEnv = setupNunjucks(app);

  // Templating: custom globals and filters
  templatingGlobals.configure({
    devMode: app.locals.devMode,
    launchTime: LAUNCH_TIME,
    nunjucksEnvironment: njEnv
  });
  templatingFilters.configure(njEnv);

  // Body parsers config
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(async (req, res, next) => {
    // Multer auto cleanup (actual Multer middleware is declared at initUploadMiddleware())
    res.on("finish", cleanupFormFilesCallback(req, res));
    res.on("close", cleanupFormFilesCallback(req, res));
    next();
  });

  // Templating: rendering context
  app.use(function templateTooling(req: CustomRequest, res: any, next: express.NextFunction) {
    /* Allows anyone to display an error page.
     * Calling render() after an errorPage() is tolerated an will be a no-op, although it would be bad practice.
     */
    res.errorPage = (code: number, error?: Error) => {
      errorPage(req, res, code, error, app.locals.devMode);
      res.alreadyRenderedWithError = true;
    };

    /* Shorthand for rendering errors on promise failures.
     * Calling render() after a traceAndShowErrorPage() is tolerated and will be a no-op,
     * although it would be bad practice. (This method helps catching rejections properly on promises
     * that are *asynchronously* awaited, eg. while awaiting other services in the middle of preparing a Promise.all().
     * You should prefer refactoring your code rather than use this)
     */
    res.traceAndShowErrorPage = (error?: Error) => {
      errorPage(req, res, 500, error, app.locals.devMode);
      res.alreadyRenderedWithError = true;
    };

    // Context made available anywhere
    const nativeRender = res.render;
    res.render = (template, context) => {
      if (!res.alreadyRenderedWithError) {
        const mergedContext = Object.assign({
          rootUrl: config.ROOT_URL,
          csrfToken: () => '<input type="hidden" name="_csrf" value="' + req.csrfToken() + '" />',
        }, res.locals, context);
        nativeRender.call(res, template, mergedContext);
        res.rendered = true;
      }
    };

    const nativeRedirect = res.redirect;
    res.redirect = (...args) => {
      if (res.locals.alerts.length > 0) {
        // Store the notifications until the next page
        req.session.alerts = res.locals.alerts;
      }
      nativeRedirect.apply(res, args);
    };

    next();
  });

  // Routing: Views
  routes(app);

  // Routing: 500/404
  app.use(createErrorRenderingMiddleware(app.locals.devMode));
}

function setupNunjucks(app) {
  const loader = new nunjucks.FileSystemLoader(app.get("views"), {
    watch: app.locals.devMode,
    noCache: app.locals.devMode,
  });

  const env = new nunjucks.Environment(loader, {});

  const engine = function(filePath, ctx, cb) {
    env.render(path.extname(this.name) ? this.name : this.name + this.ext, ctx, cb);
  };

  let engineName = app.get("view engine");

  if (!engineName) {
    engineName = "html";
    app.set("view engine", engineName);
  }

  app.engine(engineName, engine);

  return env;
}

function cleanupFormFilesCallback(req: express.Request, res: express.Response) {
  return async function cleanupFormFiles() {
    if (res.locals.form) {
      res.locals.form.files.forEach((key) => {
        const fileInfo = res.locals.form.files[key];
        if (fileInfo) {
          if (Array.isArray(fileInfo)) {
            for (const fileInfoEntry of fileInfo) {
              fileStorage.remove(fileInfoEntry.path);
            }
          } else {
            fileStorage.remove(fileInfo.path);
          }
        }
      });
    }
    res.removeAllListeners("finish");
    res.removeAllListeners("close");
  };
}

async function createSessionMiddleware(sessionStore) {
  promisifySession();

  return expressSession({
    cookie: {
      path: "/",
      httpOnly: true,
      secure: config.SECURE_SESSION_COOKIES || false,
      maxAge: null, // Expire when the browser closes (typically)
    },
    resave: false,
    saveUninitialized: false,
    secret: await getOrCreateSessionSecret(),
    store: sessionStore,
  });
}

async function getOrCreateSessionSecret() {
  let secret = await settings.find(constants.SETTING_SESSION_SECRET);
  if (!secret) {
    secret = randomKey.generate();
    await settings.save(constants.SETTING_SESSION_SECRET, secret);
  }
  return secret;
}

function createSessionStore() {
  const KnexSessionStore = connectSessionKnex(expressSession);
  return new KnexSessionStore({
    knex: db.knex,
    tablename: "sessions",
    createtable: true,
    clearInterval: 60000, // Milliseconds between clearing expired sessions
  });
}

function promisifySession() {
  // For each session method that takes a callback, add a promisified variant
  // as well. Make sure these are not enumerable to avoid confusing anything.
  const Session = (expressSession as any).Session;
  ["regenerate", "destroy", "reload", "save"].forEach((funcName) => {
    const originalFunction = Session.prototype[funcName];
    const asyncFunction = promisify(function(callback) { originalFunction.call(this, callback); });
    Object.defineProperty(Session.prototype, funcName + "Async", {
      configurable: true,
      enumerable: false,
      value: asyncFunction,
      writable: false,
    });
  });
}

async function findOrCreateSessionKey() {
  let sessionKey = await settings.find(constants.SETTING_SESSION_KEY);
  if (!sessionKey) {
    sessionKey = randomKey.generate();
    await settings.save(constants.SETTING_SESSION_KEY, sessionKey);
  }
  return sessionKey;
}
