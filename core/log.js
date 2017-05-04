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
  winston.remove(winston.transports.Console)
  winston.add(winston.transports.Console, {
    timestamp: function () {
      return moment().format('hh:mm:ss.SSS')
    },
    formatter: function (options) {
      // Figure out the logging caller location (XXX slow and hacky approach)
      let location = '?'
      let stack = new Error().stack.split('\n')
      if (stack.length > 12) {
        let locInfo = new Error().stack.split('\n')[12]
        .replace(/(.*\()/g, '')
          .replace(process.cwd(), '')
          .split(/[ :]/g)
          location = locInfo[locInfo.length - 3].replace('\\', '') +
          ':' + locInfo[locInfo.length - 2]
        }

      // Build the logging line
      let level = options.level
      let prefix = options.timestamp() + ' ' + options.level.toUpperCase() + ' (' + location + ')'
      return winston.config.colorize(level, prefix) + (options.message ? ' ' + options.message : '')
    },
    colorize: true
  })

  return winston
}