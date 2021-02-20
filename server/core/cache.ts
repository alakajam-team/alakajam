/* eslint-disable max-classes-per-file */

/**
 * Cache configuration
 */

import NodeCache from "node-cache";
import { User } from "server/entity/user.entity";
import config from "./config";

export const TTL_ONE_DAY = 24 * 60 * 3600;
export const TTL_ONE_MINUTE = 60;

/*
 * Caches declaration
 * stdTTL: (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
 */
const generalTtl = TTL_ONE_DAY;
const usersTtl = 10 * TTL_ONE_MINUTE;
const eventsTtl = TTL_ONE_DAY;
const settingsTtl = TTL_ONE_DAY;
const articlesTtl = TTL_ONE_DAY;
const entryImportTtl = 3 * TTL_ONE_MINUTE;
const rateLimiterTtl = TTL_ONE_MINUTE;

let Cache: any = NodeCache;
if (config.DEBUG_DISABLE_CACHE) {
  Cache = class {
    private fastExpiryCache = new NodeCache({ stdTTL: 1 });

    public get = (key) => this.fastExpiryCache.get(key);
    public set = (key, value) => this.fastExpiryCache.set(key, value); // Ignore any custom TTL
    public del = (key) => this.fastExpiryCache.del(key);
    public keys = () => [];
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
  rateLimiter: new Cache({ stdTTL: rateLimiterTtl }) as NodeCache
};

export default {
  general: cacheMap.general,
  user,
  settings: cacheMap.settings,
  eventsById: cacheMap.eventsById,
  eventsByName: cacheMap.eventsByName,
  articles: cacheMap.articles,
  entryImport: cacheMap.entryImport,
  rateLimiter: cacheMap.rateLimiter,

  getOrFetch,

  cacheMap,
};

/**
 * Provides access to the cache for user information
 */
function user(userOrName: User | string): PrefixedNodeCache {
  const userName = (typeof userOrName === "string") ? userOrName : userOrName.get("name");
  return new PrefixedNodeCache(cacheMap.users, userName);
}

class PrefixedNodeCache {

  private cache: NodeCache;
  private fullPrefix: string;

  public constructor(cache: NodeCache, prefix: string) {
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

async function getOrFetch<T>(cache: NodeCache, key: string, asyncFetch: () => T | Promise<T>, ttl?: number): Promise<T> {
  if (!cache.get<T>(key)) {
    const result = await asyncFetch();
    cache.set<T>(key, result, ttl);
  }
  return cache.get<T>(key);
}
