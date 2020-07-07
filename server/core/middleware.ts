/**
 * Server middleware configuration.
 *
 * Sets up:
 * - Static file serving (CSS/JS/images)
 * - Templating (nunjucks)
 * - Form parsing / file upload (formidable)
 * - Error pages
 */

import * as bodyParser from "body-parser";
import * as connectSessionKnex from "connect-session-knex";
import * as cookies from "cookies";
import * as express from "express";
import { NextFunction, Request, Response } from "express";
import * as expressSession from "express-session";
import JSXPistols, { defaultBabelOptions } from "jsx-pistols";
import * as nunjucks from "nunjucks";
import * as path from "path";
import * as randomKey from "random-key";
import { CommonLocals } from "server/common.middleware";
import settings from "server/core/settings";
import { createErrorRenderingMiddleware, errorPage } from "server/error.middleware";
import { routes } from "server/routes";
import { CustomRequest, CustomResponse, Mutable } from "server/types";
import passwordRecoveryService from "server/user/password-recovery/password-recovery.service";
import { promisify } from "util";
import config, * as configUtils from "./config";
import constants from "./constants";
import db from "./db";
import fileStorage from "./file-storage";
import log from "./log";
import { setUpJSXLocals } from "./middleware.jsx";
import { SETTING_SESSION_KEY, SETTING_SESSION_SECRET } from "./settings-keys";
import * as templatingFilters from "./templating-filters";
import * as templatingGlobals from "./templating-globals";

const LAUNCH_TIME = Date.now();

export let NUNJUCKS_ENV: nunjucks.Environment | undefined;

const jsxPistolsBabelOptions = defaultBabelOptions;
jsxPistolsBabelOptions.plugins.push("@babel/plugin-proposal-optional-chaining");

export const jsxPistols = new JSXPistols({
  rootPath: path.join(__dirname, ".."),
  babelOptions: process.env.NODE_ENV === "production" ? "skip" : jsxPistolsBabelOptions
});

/*
 * Setup app middleware
 */
export async function configure(app: express.Application) {
  app.locals.config = config;

  // Slow requests logging
  if (config.DEBUG_TRACE_SLOW_REQUESTS > -1) {
    app.use((req: Request, res: Response, next: NextFunction) => {
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
  await passwordRecoveryService.loadPasswordRecoveryCache(app);

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
  const njEnv = NUNJUCKS_ENV = setupNunjucks(app);

  // Templating: custom globals and filters
  templatingGlobals.configure({
    devMode: app.locals.devMode,
    launchTime: LAUNCH_TIME,
    nunjucksEnvironment: njEnv
  });
  templatingFilters.configure(njEnv);

  // Body parsers config
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Multer auto cleanup (actual Multer middleware is declared at initUploadMiddleware())
    res.on("finish", cleanupFormFilesCallback(req, res));
    res.on("close", cleanupFormFilesCallback(req, res));
    next();
  });

  // Templating: rendering context
  app.use(function templateTooling(req: CustomRequest, res: CustomResponse<Mutable<CommonLocals>>, next: NextFunction) {
    res.locals.rootUrl = config.ROOT_URL;
    res.locals.csrfToken = () => '<input type="hidden" name="_csrf" value="' + req.csrfToken() + '" />';
    setUpJSXLocals(req, res);

    let alreadyRenderedWithError = false;

    /* Allows anyone to display an error page.
     * Calling render() after an errorPage() is tolerated an will be a no-op, although it would be bad practice.
     */
    res.errorPage = (code: number, error?: Error) => {
      errorPage(req, res, code, error, app.locals.devMode);
      alreadyRenderedWithError = true;
    };

    /* Shorthand for rendering errors on promise failures.
     * Calling render() after a traceAndShowErrorPage() is tolerated and will be a no-op,
     * although it would be bad practice. (This method helps catching rejections properly on promises
     * that are *asynchronously* awaited, eg. while awaiting other services in the middle of preparing a Promise.all().
     * Using custom logic to handle errors is usually cleaner than using this.)
     */
    res.traceAndShowErrorPage = (error?: Error) => {
      errorPage(req, res, 500, error, app.locals.devMode);
      alreadyRenderedWithError = true;
    };

    // Context made available anywhere
    const nativeRender = res.render;
    res.render = (template: string, context: Record<string, any>) => {
      if (!alreadyRenderedWithError) {
        const mergedContext = Object.assign(res.locals, context);
        nativeRender.call(res, template, mergedContext);
      }
    };

    res.renderJSX = async <T extends CommonLocals> (templateName: string, context: T) => {
      if (!alreadyRenderedWithError) {
        try {
          res.write("<!doctype html>" + await jsxPistols.render(templateName + ".template", context));
          res.end();
        } catch (e) {
          errorPage(req, res, 500, e, {showErrorDetails: app.locals.devMode});
        }
      }
    };

    const nativeRedirect = res.redirect;
    res.redirect = async (...args) => {
      if (res.locals.alerts.length > 0) {
        // Store the notifications until the next page
        req.session.alerts = res.locals.alerts;
        await req.session.saveAsync();
      }
      nativeRedirect.apply(res, args);
    };

    res.redirectToLogin = () => {
      res.redirect("/login?redirect=" + req.url);
    };

    next();
  });

  // Routing: Views
  routes(app);

  // Routing: 500/404
  app.use(createErrorRenderingMiddleware(app.locals.devMode));
}

export function logErrorAndReturn(value: any) {
  return (reason: any) => {
    if (reason instanceof Error) {
      log.error(reason.message, reason.stack);
    } else {
      log.error(reason);
    }
    return value;
  };
}

function setupNunjucks(app: express.Application) {
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

function cleanupFormFilesCallback(req: Request, res: Response) {
  return function cleanupFormFiles() {
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
  let secret = await settings.find(SETTING_SESSION_SECRET);
  if (!secret) {
    secret = randomKey.generate();
    await settings.save(SETTING_SESSION_SECRET, secret);
  }
  return secret;
}

function createSessionStore() {
  const KnexSessionStore = (connectSessionKnex as any)(expressSession);
  return new KnexSessionStore({
    knex: db.knex as any,
    tablename: "sessions",
    createTable: true,
    clearInterval: 60000, // Milliseconds between clearing expired sessions
  });
}

function promisifySession() {
  // For each session method that takes a callback, add a promisified variant
  // as well. Make sure these are not enumerable to avoid messing up with anything.
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
  let sessionKey = await settings.find(SETTING_SESSION_KEY);
  if (!sessionKey) {
    sessionKey = randomKey.generate();
    await settings.save(SETTING_SESSION_KEY, sessionKey);
  }
  return sessionKey;
}
