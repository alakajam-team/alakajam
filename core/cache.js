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
const generalTtl = 24 * 60 * 60 // one day
const usersTtl = 10 * 60 // 10 minutes
const eventsTtl = 24 * 60 * 60 // one day
const settingsTtl = 24 * 60 * 60 // one day

const cacheMap = {
  general: new NodeCache({ stdTTL: generalTtl, checkperiod: generalTtl }),
  users: new NodeCache({ stdTTL: usersTtl, checkperiod: usersTtl }),
  settings: new NodeCache({ stdTTL: settingsTtl, checkperiod: settingsTtl }),
  eventsById: new NodeCache({ stdTTL: eventsTtl, checkperiod: eventsTtl }),
  eventsByName: new NodeCache({ stdTTL: eventsTtl, checkperiod: eventsTtl })
}

module.exports = {
  general: cacheMap.general,
  user,
  settings: cacheMap.settings,
  eventsById: cacheMap.eventsById,
  eventsByName: cacheMap.eventsByName,

  getOrFetch,

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

async function getOrFetch (cache, key, asyncFetch, ttl = undefined) {
  if (!cache.get(key)) {
    let result = await asyncFetch()
    cache.set(key, result, ttl)
  }
  return cache.get(key)
}
