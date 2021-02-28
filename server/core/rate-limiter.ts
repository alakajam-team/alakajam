import cache from "./cache";

/**
 * Drops calls to the provided callback in case of too frequent usage.
 * Note: For protection against attacks, prefer using the route-level limiter (see "sensitiveActionsSlowDown" in routes.ts).
 * This function is more meant as a fake scheduler do prevent non-critical code from running too frequently.
 * @param key Rate limiting key
 * @param minDelayS Delay during which all calls after the initial one are dropped, in seconds
 * @param callback Function to be called when accepted
 */
export async function rateLimit(key: string, minDelayS: number, callback: () => any): Promise<boolean> {
  let wasCalled = false;

  await cache.getOrFetch(cache.rateLimiter, key, async () => {
    await callback();
    wasCalled = true;
    return true;
  }, minDelayS);

  return wasCalled;
}
