// tslint:disable: max-classes-per-file

/**
 * Cache configuration
 *
 * @module core/cache
 */

import * as NodeCache from "node-cache";
import config from "./config";

/*
 * Caches declaration
 * stdTTL: (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
 */
const generalTtl = 24 * 60 * 3600; // one day
const usersTtl = 10 * 60; // 10 minutes
const eventsTtl = 24 * 60 * 3600; // one day
const settingsTtl = 24 * 60 * 3600; // one day
const articlesTtl = 24 * 60 * 3600; // one day
const entryImportTtl = 3 * 60; // 3 minutes

let Cache: any = NodeCache;
if (config.DEBUG_DISABLE_CACHE) {
  Cache = class {
    private fastExpiryCache = new NodeCache({ stdTTL: 1 });

    public get = (key) => this.fastExpiryCache.get(key);
    public set = (key, value) => this.fastExpiryCache.set(key, value); // Ignore any custom TTL
    public del = (key) => this.fastExpiryCache.del(key);
    public keys = () => ({});
    public getStats = () => ({});
  };
}

const cacheMap = {
  general: new Cache({ stdTTL: generalTtl }) as NodeCache,
  users: new Cache({ stdTTL: usersTtl }) as NodeCache,
  settings: new Cache({ stdTTL: settingsTtl }) as NodeCache,
  eventsById: new Cache({ stdTTL: eventsTtl }) as NodeCache,
  eventsByName: new Cache({ stdTTL: eventsTtl }) as NodeCache,
  articles: new Cache({ stdTTL: articlesTtl }) as NodeCache,
  entryImport: new Cache({ stdTTL: entryImportTtl }) as NodeCache,
};

export default {
  general: cacheMap.general,
  user,
  settings: cacheMap.settings,
  eventsById: cacheMap.eventsById,
  eventsByName: cacheMap.eventsByName,
  articles: cacheMap.articles,
  entryImport: cacheMap.entryImport,

  getOrFetch,

  cacheMap,
};

/**
 * Provides access to the cache for user information
 * @param  {User|string} userModel User model, or directly the user name
 * @return {PrefixedNodeCache} cache
 */
function user(userModel): NodeCache {
  return new PrefixedNodeCache(cacheMap.users,
      (typeof userModel === "string") ? userModel : userModel.get("name")) as any;
}

class PrefixedNodeCache {
  private cache: any;
  private fullPrefix: string;

  constructor(cache, prefix) {
    this.cache = cache;
    this.fullPrefix = prefix.toLowerCase() + "_";
  }
  public get(key) {
    return this.cache.get(this.fullPrefix + key);
  }
  public set(key, value, ttl?) {
    return this.cache.set(this.fullPrefix + key, value, ttl);
  }
  public del(key) {
    return this.cache.del(this.fullPrefix + key);
  }
}

async function getOrFetch(cache, key, asyncFetch, ttl?) {
  if (!cache.get(key)) {
    const result = await asyncFetch();
    cache.set(key, result, ttl);
  }
  return cache.get(key);
}
