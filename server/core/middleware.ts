/**
 * Server middleware configuration.
 *
 * Sets up:
 * - Static file serving (CSS/JS/images)
 * - Templating (JSX through jsx-pistols)
 * - Form parsing / file upload (formidable)
 * - Error pages
 */

import * as bodyParser from "body-parser";
import connectSessionKnex from "connect-session-knex";
import * as cookies from "cookies";
import * as crypto from "crypto";
import express, { NextFunction, Request, Response } from "express";
import expressSession from "express-session";
import expressSlowDown from "express-slow-down";
import JSXPistols, { defaultBabelOptions } from "jsx-pistols";
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
import db from "./db";
import fileStorage from "./file-storage";
import log from "./log";
import { setUpJSXLocals } from "./middleware.jsx";
import { SETTING_SESSION_KEY, SETTING_SESSION_SECRET } from "./settings-keys";

const LAUNCH_TIME = Date.now();

const jsxPistolsBabelOptions = defaultBabelOptions;
jsxPistolsBabelOptions.plugins.push("@babel/plugin-proposal-optional-chaining");

/*
 * Setup app middleware
 */
export async function configure(app: express.Application): Promise<void> {
  app.locals.config = config;

  // In-memory data
  await passwordRecoveryService.loadPasswordRecoveryCache(app);

  // Static files
  app.use("/static", express.static(configUtils.staticPathAbsolute()));
  app.use("/dist/client", express.static(configUtils.clientBuildPathAbsolute()));
  app.use("/data/uploads", express.static(configUtils.uploadsPathAbsolute()));

  // Trace requests
  if (config.DEBUG_TRACE_REQUESTS) {
    app.use(traceRequestsMiddleware);
  }

  // Speed limit against bots
  if (!config.DEBUG_DISABLE_SLOW_DOWN) {
    const slowDownMiddleware = expressSlowDown({
      windowMs: 60 * 1000, // 1 minute
      delayAfter: 60,
      delayMs: 500,
      onLimitReached: (req) => {
        log.info("Slowing down IP " + req.ip);
      }
    });
    app.use(slowDownMiddleware);
  }

  // Session management
  const sessionKey = await findOrCreateSessionKey();
  app.use(cookies.express([sessionKey]));
  app.locals.sessionStore = createSessionStore();
  app.use(await createSessionMiddleware(app.locals.sessionStore));

  // Templating
  const templatesRootPath = path.join(__dirname, "..");
  const jsxPistols = new JSXPistols({
    rootPath: templatesRootPath,
    babelOptions: jsxPistolsBabelOptions,
    expressApp: app
  });
  const expressEngine = async (filePath: string, options: any, callback: (e?: Error, output?: string) => void) => {
    try {
      const output = await jsxPistols.render(filePath, options);
      callback(null, output);
    } catch (e) {
      callback(e);
    }
  };

  if (process.env.NODE_ENV === "production") {
    app.engine("template.js", expressEngine);
    app.set("view engine", "template.js");
  } else {
    app.engine("template.tsx", expressEngine);
    app.set("view engine", "template.tsx");
  }
  app.set("views", templatesRootPath);

  // Body parsers config
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Multer auto cleanup (actual Multer middleware is declared at initUploadMiddleware())
    res.on("finish", cleanupFormFilesCallback(req, res));
    res.on("close", cleanupFormFilesCallback(req, res));
    next();
  });

  // Templating: rendering context
  app.use(function templateTooling(req: CustomRequest, res: CustomResponse<Mutable<CommonLocals>>, next: NextFunction): void {
    res.locals.rootUrl = config.ROOT_URL;
    res.locals.devMode = app.locals.devMode;
    res.locals.launchTime = LAUNCH_TIME;
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

export function traceRequestsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const minRequestDuration = config.DEBUG_TRACE_SLOW_REQUESTS || -1;
  if (!req.url.startsWith("/data") && !req.url.startsWith("/static") && !req.url.startsWith("/dist")) {
    // Trace start
    res.locals.requestId = crypto.randomBytes(3).toString("hex");
    res.locals.startTime = Date.now();
    if (minRequestDuration < 0) {
      log.debug(`[${res.locals.requestId}] START ${req.url}`);
    }

    // Trace end
    res.on("finish", () => {
      const duration = Date.now() - res.locals.startTime;
      if (duration > minRequestDuration) {
        log.debug(`[${res.locals.requestId}] ${minRequestDuration < 0 ? "END" : ""} (${duration}ms) ${req.url}`);
      }
    });
  }
  next();
}

export function logErrorAnd<T>(callback: (reason: Error | string) => T): (reason: Error | string) => T {
  return (reason: Error | string) => {
    if (reason instanceof Error) {
      log.error(`${reason.message}\n${reason.stack}`);
    } else {
      log.error(reason);
    }
    return callback(reason);
  };
}

function cleanupFormFilesCallback(req: Request, res: Response) {
  return function cleanupFormFiles() {
    if (res.locals.form) {
      res.locals.form.files.forEach((key) => {
        const fileInfo = res.locals.form.files[key];
        if (fileInfo) {
          if (Array.isArray(fileInfo)) {
            for (const fileInfoEntry of fileInfo) {
              fileStorage.remove(fileInfoEntry.path)
                .catch(e => log.error(e));
            }
          } else {
            fileStorage.remove(fileInfo.path)
              .catch(e => log.error(e));
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
      sameSite: "lax"
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
