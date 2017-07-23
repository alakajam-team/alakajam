'use strict'

/**
 * Cache configuration
 *
 * @module core/cache
 */

const NodeCache = require('node-cache')

/*
 * Caches declaration
 * stdTTL: (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
 * checkperiod: (default: 600) The period in seconds, as a number, used for the automatic delete check interval. 0 = no periodic check.
 */
const usersTtlInMins = 10
const cacheMap = {
  users: new NodeCache({ stdTTL: usersTtlInMins * 60, checkperiod: usersTtlInMins * 60 })
}

module.exports = {
  user,
  cacheMap
}

/**
 * Provides access to the cache for user information
 * @param  {User|string} user User model, or directly the user name
 * @return {PrefixedNodeCache} cache
 */
function user (user) {
  return new PrefixedNodeCache(cacheMap.users, (typeof user === 'string') ? user : user.get('name'))
}

class PrefixedNodeCache {
  constructor (cache, prefix) {
    this.cache = cache
    this.fullPrefix = prefix.toLowerCase() + '_'
  }
  get (key) {
    return this.cache.get(this.fullPrefix + key)
  }
  set (key, value, ttl) {
    return this.cache.set(this.fullPrefix + key, value, ttl)
  }
  del (key) {
    return this.cache.del(this.fullPrefix + key)
  }
}
