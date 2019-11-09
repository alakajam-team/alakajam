import * as countriesAndTimezones from "countries-and-timezones";
import * as luxon from "luxon";
import cache, { TTL_ONE_DAY } from "server/core/cache";

export class UserTimeZoneService {

  public getAllTimeZones(): Promise<TimeZone[]> {
    return cache.getOrFetch(cache.general, "allTimeZones", async () => {
      return Object.values(countriesAndTimezones.getAllCountries() as TimezonesByCountry)
        .map(this.countryToTimezones)
        .reduce((list1, list2) => list1.concat(list2), []);
    }, TTL_ONE_DAY);
  }

  public async isValidTimeZone(str: string): Promise<boolean> {
    const allTimeZones = await this.getAllTimeZones();
    return allTimeZones.some((timezone) => timezone.id === str);
  }

  private countryToTimezones(country: CountryTimeZones): TimeZone[] {
    return country.timezones
      .map((timezoneId) => {
        const testDate = luxon.DateTime.utc().setZone(timezoneId);
        return {
          id: timezoneId,
          valid: testDate.isValid,
          offsetName: testDate.offsetNameShort,
          countryName: country.name
        };
      })
      .filter((timezoneInfo) => timezoneInfo.valid)
      .map(({ id, offsetName, countryName }) => ({ id, offsetName, countryName }));
  }

}

export interface TimeZone {
  id: string;
  offsetName: string;
  countryName: string;
}

interface CountryTimeZones {
  id: string;
  name: string;
  timezones: string[];
}

interface TimezonesByCountry {
  [countryId: string]: CountryTimeZones;
}

export default new UserTimeZoneService();
