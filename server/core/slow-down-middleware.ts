import { RequestHandler } from "express";
import expressSlowDown, { AugmentedRequest } from "express-slow-down";
import log from "./log";

interface SlowDownOptions {
  windowMs: number;
  delayAfter: number;
  delayMs: number;
  logMessage: string;
}

/**
 * express-slow-down 3 has no more `onLimitReached` callback: log when a client crosses the threshold instead.
 */
export function initSlowDownMiddleware({ logMessage, ...options }: SlowDownOptions): RequestHandler {
  const slowDown = expressSlowDown(options);
  return (req, res, next) => {
    slowDown(req, res, (error?: unknown) => {
      const slowDownInfo = (req as unknown as AugmentedRequest).slowDown;
      if (!error && slowDownInfo && slowDownInfo.used === slowDownInfo.limit + 1) {
        log.info(logMessage + req.ip);
      }
      next(error);
    });
  };
}
