'use strict'

/**
 * Cache configuration
 *
 * @module core/cache
 */

const config = require('../config')
const NodeCache = require('node-cache')

/*
 * Caches declaration
 * stdTTL: (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
 */
const generalTtl = 24 * 60 * 3600 // one day
const usersTtl = 10 * 60 // 10 minutes
const eventsTtl = 24 * 60 * 3600 // one day
const settingsTtl = 24 * 60 * 3600 // one day
const articlesTtl = 24 * 60 * 3600 // one day
const entryImportTtl = 3 * 60 // 3 minutes

let Cache = NodeCache
if (config.DEBUG_DISABLE_CACHE) {
  Cache = function () {
    let fastExpiryCache = new NodeCache({ stdTTL: eventsTtl })

    this.get = key => fastExpiryCache.get(key)
    this.set = (key, value) => fastExpiryCache.set(key, value) // Ignore any custom TTL
    this.del = key => fastExpiryCache.del(key)
    this.keys = function () {}
    this.getStats = function () {}
  }
}

const cacheMap = {
  general: new Cache({ stdTTL: generalTtl }),
  users: new Cache({ stdTTL: usersTtl }),
  settings: new Cache({ stdTTL: settingsTtl }),
  eventsById: new Cache({ stdTTL: eventsTtl }),
  eventsByName: new Cache({ stdTTL: eventsTtl }),
  articles: new Cache({ stdTTL: articlesTtl }),
  entryImport: new Cache({ stdTTL: entryImportTtl })
}

module.exports = {
  general: cacheMap.general,
  user,
  settings: cacheMap.settings,
  eventsById: cacheMap.eventsById,
  eventsByName: cacheMap.eventsByName,
  articles: cacheMap.articles,
  entryImport: cacheMap.entryImport,

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
