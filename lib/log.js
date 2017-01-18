'use strict'

const winston = require('winston')
const moment = require('moment')

// Little bit of spacing
console.log('')

// Activate colors + use custom formatter
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {
  timestamp: function () {
    return moment().format('hh:mm:ss.SSS')
  },
  formatter: function (options) {
    let level = options.level
    let prefix = options.timestamp() + ' ' +
        options.level.toUpperCase() +
        ' (' + computeLocation() + ')'
    return winston.config.colorize(level, prefix) + (options.message ? ' ' + options.message : '')
  },
  colorize: true
})

module.exports = winston

/**
 * Slow and hacky approach for displaying the caller location
 * XXX Tested on Windows only
 */
function computeLocation () {
  let locInfo = new Error().stack.split('\n')[12]
      .replace(/(.*\()/g, '')
      .replace(process.cwd(), '')
      .split(/[ :]/g)
  return locInfo[locInfo.length - 3].replace('\\', '') +
        ':' + locInfo[locInfo.length - 2]
}
