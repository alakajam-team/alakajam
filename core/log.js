'use strict'

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

const path = require('path')
const winston = require('winston')
const moment = require('moment')

module.exports = initializeLogging()

/*
 * Configure the Winston logger to print pretty & informative log lines
 */
function initializeLogging () {
  // Little bit of spacing upon server boot
  console.log('')

  // Activate colors + use custom formatter
  let sourcesRoot = path.join(__dirname, '..')
  winston.remove(winston.transports.Console)
  winston.add(winston.transports.Console, {
    timestamp: function () {
      return moment().format('hh:mm:ss.SSS')
    },
    formatter: function (options) {
      // Figure out the logging caller location
      // XXX slow and hacky approach, not thoroughly & cross-platformly tested
      let location = '?'
      let lines = new Error().stack.split('\n')
      for (let line of lines) {
        if (line.indexOf(sourcesRoot) !== -1 &&
            line.indexOf(__filename) === -1 &&
            line.indexOf('node_modules') === -1) {
          let locInfo = line.replace(/(.*\()/g, '')
            .replace(process.cwd(), '')
            .split(/[ :]/g)
          location = locInfo[locInfo.length - 3].replace('\\', '') +
            ':' + locInfo[locInfo.length - 2]
          break
        }
      }

      // Build the logging line
      let level = options.level
      let prefix = options.timestamp() + ' ' + options.level.toUpperCase() + ' (' + location + ')'
      return winston.config.colorize(level, prefix) + (options.message ? ' ' + options.message : '')
    },
    colorize: true
  })

  /**
   * Logs the current stacktrace at info level
   */
  winston.whereami = function () {
    let lines = new Error().stack.split('\n')
    winston.info('I am' + lines.slice(2).join('\n'))
  }

  return winston
}
