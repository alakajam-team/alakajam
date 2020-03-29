import * as luxon from "luxon";
import { User } from "server/entity/user.entity";
import constants from "./constants";

export const ZONE_UTC = "utc";

luxon.Settings.defaultLocale = "en";
luxon.Settings.defaultZoneName = ZONE_UTC;

/**
 * Luxon docs: https://moment.github.io/luxon/docs/
 */
export function createLuxonDate(
  date?: string | number | Date,
  options: luxon.DateTimeOptions = {},
  format?: string): luxon.DateTime {
  options.zone = options.zone || ZONE_UTC;
  if (date === undefined) {
    return luxon.DateTime.fromObject(options);
  } else if (typeof date === "number") {
    return luxon.DateTime.fromMillis(date, options);
  } else if (typeof date === "string") {
    if (format) {
      return luxon.DateTime.fromFormat(date, format, options);
    } else {
      return luxon.DateTime.fromISO(date, options);
    }
  } else {
    return luxon.DateTime.fromJSDate(date, options);
  }
}

export function formatDate(
  date: string | number | Date | undefined,
  user: User | undefined,
  format: string,
  options: { utcSuffixByDefault?: boolean } = { utcSuffixByDefault: true }): string {
  if (date) {
    const useDefaultTimezone = !(user && user.get("timezone"));

    let luxonDate = createLuxonDate(date);
    if (user && user.get("timezone")) {
      luxonDate = luxonDate.setZone(user.get("timezone"));
    }

    return luxonDate
      .toFormat(format)
      .replace(constants.ORDINAL_DAY_TOKEN, ordinal(luxonDate.day))
      .replace(/(AM)$/, "am")
      .replace(/(PM)$/, "pm")
      + ((options.utcSuffixByDefault && useDefaultTimezone && format.match(/[hH]/g)) ? " UTC" : "");
  } else {
    return "";
  }
}

export function ordinal(n: number): string {
  // source: https://stackoverflow.com/a/12487454
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
