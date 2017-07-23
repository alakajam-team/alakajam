'use strict'

/**
 * Cache configuration
 *
 * @module core/cache
 */

const NodeCache = require('node-cache')
/*
 * stdTTL: (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
 * checkperiod: (default: 600) The period in seconds, as a number, used for the automatic delete check interval. 0 = no periodic check.
 */
const ttlInMins = 10
const cache = new NodeCache({ stdTTL: ttlInMins * 60, checkperiod: ttlInMins * 60 })
// cache.set("newComments", true)

module.exports = {
  cache,
  ttlInMins
}
