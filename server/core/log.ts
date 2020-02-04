/**
 * Logging configuration (uses Winston).
 *
 * @description ## Usage
 * ```
 * log.debug('message')
 * log.info('message')
 * log.warn('message')
 * log.error('message')
 * ```
 *
 * @module core/log
 */

import { sync as findUp } from "find-up";
import * as luxon from "luxon";
import * as path from "path";
import * as util from "util";
import { createLogger, format, transports } from "winston";
import winston = require("winston");

const SOURCES_ROOT = path.dirname(findUp("package.json", { cwd: __dirname }));
const LOCAL_TIME_ZONE = new luxon.LocalZone();

let level = "info";
try {
  // tslint:disable-next-line: no-var-requires
  const config = require(path.resolve(SOURCES_ROOT, "config"));
  level = config.LOG_LEVEL;
} catch (e) {
  // Nothing (config file might not be created yet)
}

const colorizer = format.colorize();

/*
 * Custom formatter allows printing pretty, colorful & informative log lines
 */
const customFormat = {
  transform: (options) => {
    // Figure out the logging caller location
    // XXX slow and hacky approach
    let location = "?";
    const lines = new Error().stack.split("\n");
    for (const line of lines) {
      if (line.indexOf(SOURCES_ROOT) !== -1 &&
        line.indexOf(__filename) === -1 &&
        line.indexOf("node_modules") === -1) {
        const locInfo = line.replace(/(.*\()/g, "")
          .replace(process.cwd(), "")
          .split(/[ :]/g);
        location = locInfo[locInfo.length - 3].replace("\\", "") +
          ":" + locInfo[locInfo.length - 2];
        break;
      }
    }

    // Build the logging line
    const timestamp = luxon.DateTime.local().setZone(LOCAL_TIME_ZONE).toFormat("yyyy-MM-dd HH:mm:ss.SSS");
    const prefix = timestamp + " " + options.level.toUpperCase() + " (" + location + ")";
    const message = options.message ? (" " + util.format(options.message)) : "";
    const prefixedMessage = colorizer.colorize(options.level, prefix) + message;

    return {
      level: options.level,
      message: prefixedMessage
    };
  }
};

const log = createLogger({
  level,
  format: format.combine(
    format.splat(),
    customFormat
  ),
  transports: [new transports.Console()]
});

/**
 * Logs the current stacktrace at info level
 */
(log as any).whereami = () => {
  const lines = new Error().stack.split("\n");
  log.info("I am" + lines.slice(2).join("\n"));
};

export type Logger = winston.Logger & { whereami: () => void };

export default log as Logger;
