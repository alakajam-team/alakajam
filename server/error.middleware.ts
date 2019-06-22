import { Application, Request, Response } from "express";
import log from "server/core/log";

/**
 * Routing: 500/404
 * @param devMode
 */
export function createErrorRenderingMiddleware(devMode: boolean) {
  return (error, req, res, next) => {
    if (!error) {
      errorPage(req, res, 404, undefined, devMode);
    } else {
      if (error.code === "EBADCSRFTOKEN") {
        // Replace the default error message from csurf by something more user friendly.
        error.message = "Invalid CSRF token. Your session may have expired. Please go back and try again.";
      } else if (error.code === "LIMIT_FILE_SIZE") {
        // Same with multer's upload size limit
        error.statusCode = 400;
        error.message = "Attachment is too large, please go back and check the size limit";
      }
      errorPage(req, res, error.statusCode || 500, error, devMode);
    }
  };
}

/**
 * Function displaying an error page
 * @param req
 * @param res
 * @param code HTTP error code
 * @param error object or string message (optional)
 * @param devMode
 */
export function errorPage(req: Request, res: Response, code: number, error?: Error, devMode?: boolean) {
  const stack = devMode ? error && error.stack : undefined;
  let message = (typeof error === "object") ? error.message : error;
  let title;
  switch (code) {
    case 404:
      title = "Page not found";
      break;
    case 403:
      title = "Forbidden";
      break;
    case 500:
      title = "Internal error";
      if (!devMode) {
        message = "Something went wrong, sorry about that.";
      }
      break;
    default:
      title = "Error";
  }

  // Internal error logging
  if (code !== 404 && code !== 403) {
    log.error(`HTTP ${code}: ${message}` + (error ? "\n" + error.stack : ""));
  }

  // Page rendering
  res.status(code);
  res.render("error", {
    code,
    title,
    message,
    stack,
    path: req.originalUrl, // Needed by _page.html, normally added by global.middleware
  });
}
