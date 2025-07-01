import log from "server/core/log";
import links from "server/core/links";
import eventService from "server/event/event.service";
import entryService from "server/entry/entry.service";
import { CommonLocals } from "./common.middleware";
import { CustomRequest, CustomResponse } from "./types";

/**
 * Routing: 500/404
 * @param devMode
 */
export function renderError(error: any, req: CustomRequest, res: CustomResponse<CommonLocals>, devMode: boolean): void {
  if (!error) {
    render404KajamGame(req, res, devMode);
  } else {
    if (error.code === "EBADCSRFTOKEN") {
      // Replace the default error message from csurf by something more user friendly.
      error.message = "Invalid CSRF token. Your session may have expired. Please go back and try again.";
    } else if (error.code === "LIMIT_FILE_SIZE") {
      // Same with multer's upload size limit
      error.statusCode = 400;
      error.message = "Attachment is too large, please go back and check the size limit";
    }
    errorPage(req, res, error.statusCode || 500, error, { showErrorDetails: devMode });
  }
}

/**
 * Function displaying an error page
 */
export function errorPage(
  req: CustomRequest,
  res: CustomResponse<CommonLocals>,
  httpCode: number,
  error?: Error | string,
  options: { showErrorDetails?: boolean } = {}): void {

  const stack = (options.showErrorDetails && typeof error === "object") ? error.stack : undefined;
  let message = (typeof error === "object") ? error.message : error;
  let title;
  switch (httpCode) {
  case 404:
    title = "Neither page nor 404 Kajam was found!";
    break;
  case 403:
    title = "Forbidden";
    break;
  case 500:
    title = "Internal error";
    if (!options.showErrorDetails) {
      message = "Something went wrong, sorry about that.";
    }
    break;
  default:
    title = "Error";
  }

  // Internal error logging
  if (httpCode >= 500) {
    log.error(`HTTP ${httpCode}: ${message}` + ((error && typeof error === "object") ? "\n" + error.stack : ""));
  } else if (httpCode >= 400) {
    log.warn(`HTTP ${httpCode}: ${message}`);
  }

  // Page rendering
  res.status(httpCode);
  res.render<CommonLocals>("error", {
    ...res.locals,
    code: httpCode,
    title,
    message,
    stack,
    path: req.originalUrl, // Needed by _page.html, normally added by global.middleware
  });
}

/**
 * Handle a 404 Not Found error by rendering a random entry from the 404 Kajam.
 */
export async function render404KajamGame(req: CustomRequest, res: CustomResponse<CommonLocals>, devMode: boolean): Promise<void> {
  const event = await eventService.findEventByName("16th-kajam");
  if (event) {
    const entry = await entryService.findRandomEntryForEvent(event.id);
    res.locals.alerts.push({
      type: "warning",
      message: "Oops! That page doesn't exist. Here, have a game instead.",
    });
    res.redirect(links.routeUrl(entry, "entry"));
  } else {
    errorPage(req, res, 404, undefined, { showErrorDetails: devMode });
  }
}
