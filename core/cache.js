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
const ttl_in_mins = 10
const cache = new NodeCache({ stdTTL: ttl_in_mins * 60, checkperiod: ttl_in_mins * 60 })
// cache.set("newComments", true)

module.exports = {
  cache,
  ttl_in_mins
}
