import * as luxon from "luxon";
import cache, { TTL_ONE_DAY } from "server/core/cache";
import { listTimeZones } from "timezone-support";

export interface Timezone {
  id: string;
  offsetName: string;
}

export class UserTimezoneService {

  public getAllTimeZones(): Promise<Timezone[]> {
    return cache.getOrFetch(cache.general, "allTimeZones", async () => {
      return listTimeZones()
        .filter((timezone) => !timezone.startsWith("Etc"))
        .map((timezone) => ({ id: timezone, testDate: luxon.DateTime.utc().setZone(timezone) }))
        .filter(({ testDate }) => testDate.isValid)
        .map(({ id, testDate }) => ({ id, offsetName: testDate.offsetNameShort }));
    }, TTL_ONE_DAY);
  }

}

export default new UserTimezoneService();
