import * as countriesAndTimezones from "countries-and-timezones";
import * as luxon from "luxon";
import cache, { TTL_ONE_DAY } from "server/core/cache";

export class UserTimeZoneService {

  public getAllTimeZones(): Promise<TimeZone[]> {
    return cache.getOrFetch(cache.general, "allTimeZones", () => {
      const allTimeZones = Object.values(countriesAndTimezones.getAllCountries() as TimezonesByCountry)
        .map((country) => this.countryToTimezones(country))
        .reduce((list1, list2) => list1.concat(list2), []);
      return Promise.resolve(allTimeZones);
    }, TTL_ONE_DAY);
  }

  public async getAllTimeZonesAsOptions(): Promise<Array<{ id: string; label: string }>> {
    const timezoneData = await this.getAllTimeZones();
    return timezoneData.map((timezone) => ({ id: timezone.id, label: this.formatTimezone(timezone) }));
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

  private formatTimezone(timezone: TimeZone): string {
    const continentSeparatorIndex = timezone.id.indexOf("/");
    const continent = (continentSeparatorIndex !== -1) ? timezone.id.slice(0, continentSeparatorIndex) : undefined;
    const country = timezone.countryName;
    const city = ((continentSeparatorIndex !== -1) ? timezone.id.slice(continentSeparatorIndex + 1) : timezone.id)
      .replace(/\_/g, " ");

    const formattedContinent = continent ? `${continent} > ` : "";
    return `${formattedContinent}${country} > ${city} [${timezone.offsetName}]`;
  }

}

export interface TimeZone {
  id: string;
  label?: string;
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
