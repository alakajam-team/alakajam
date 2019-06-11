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
  private cache: NodeCache;
  private fullPrefix: string;

  constructor(cache: NodeCache, prefix: string) {
    this.cache = cache;
    this.fullPrefix = prefix.toLowerCase() + "_";
  }
  public get<T>(key: string) {
    return this.cache.get<T>(this.fullPrefix + key);
  }
  public set<T>(key: string, value: T, ttl?: number) {
    return this.cache.set<T>(this.fullPrefix + key, value, ttl);
  }
  public del(key: string) {
    return this.cache.del(this.fullPrefix + key);
  }
}

async function getOrFetch<T>(cache: NodeCache, key: string, asyncFetch: () => Promise<T>, ttl?: number): Promise<T> {
  if (!cache.get<T>(key)) {
    const result = await asyncFetch();
    cache.set<T>(key, result, ttl);
  }
  return cache.get<T>(key);
}
