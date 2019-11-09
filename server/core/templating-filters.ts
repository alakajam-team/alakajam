import { BookshelfModel } from "bookshelf";
import * as leftPad from "left-pad";
import * as luxon from "luxon";
import * as slug from "slug";
import constants from "./constants";
import forms from "./forms";

luxon.Settings.defaultZoneName = "utc";

export function configure(nunjucksEnvironment) {

  nunjucksEnvironment.addFilter("keys", (obj: object) => {
    return Object.keys(obj);
  });

  nunjucksEnvironment.addFilter("values", (obj: object) => {
    return Object.values(obj);
  });

  nunjucksEnvironment.addFilter("stringify", (obj: any) => {
    return JSON.stringify(obj);
  });

  nunjucksEnvironment.addFilter("pretty", (obj: any) => {
    if (typeof obj === "object") {
      return JSON.stringify(obj, null, 2);
    } else {
      return obj;
    }
  });

  nunjucksEnvironment.addFilter("dump", (obj: any) => {
    // Override default behavior to prevent escaping non-objects
    if (typeof obj === "object") {
      return JSON.stringify(obj);
    } else {
      return obj;
    }
  });

  nunjucksEnvironment.addFilter("prettyDump", (obj: any) => {
    return "<pre>" + JSON.stringify(obj, null, 2) + "</pre>";
  });

  nunjucksEnvironment.addFilter("markdown", (str: string) => {
    return forms.markdownToHtml(str);
  });

  nunjucksEnvironment.addFilter("markdownUnescape", (str: string) => {
    return str ? str.replace(/&amp;/g, "&").replace(/&quot;/g, '"') : null;
  });

  nunjucksEnvironment.addFilter("date", (
      date: number | string | Date,
      user?: BookshelfModel,
      options: { format?: string, utcSuffixByDefault?: boolean } = {}) => {
    const useCustomFormat = !!options.format;
    const format = options.format || constants.DATE_FORMAT;
    const utcSuffixByDefault = options.utcSuffixByDefault !== undefined ? options.utcSuffixByDefault : !useCustomFormat;
    return formatDate(date, user, format, { utcSuffixByDefault });
  });

  nunjucksEnvironment.addFilter("dateTime", (date: number | string | Date, user?: BookshelfModel) => {
    return formatDate(date, user, constants.DATE_TIME_FORMAT);
  });

  nunjucksEnvironment.addFilter("featuredEventDateTime", (date: number | string | Date, user?: BookshelfModel) => {
    return formatDate(date, user, constants.FEATURED_EVENT_DATE_FORMAT);
  });

  nunjucksEnvironment.addFilter("relativeTime", (date: number | string | Date) => {
    return constructLuxonDate(date).toRelative();
  });

  nunjucksEnvironment.addFilter("duration", (durationInSeconds: number) => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds - minutes * 60;
    return minutes + "'" + leftPad(seconds.toFixed(3).replace(".", '"'), 6, "0");
  });

  nunjucksEnvironment.addFilter("ordinal", ordinal);

  nunjucksEnvironment.addFilter("digits", (n: string | number, digits: number) => {
    if (typeof n === "string") {
      n = parseFloat(n);
    }
    if (typeof n === "number") {
      return n.toFixed(digits).toString();
    } else {
      return null;
    }
  });

  nunjucksEnvironment.addFilter("leftpad", (n: string | number, toLength: number, char: string | number) => {
    return n ? leftPad(n, toLength, char) : "";
  });

  nunjucksEnvironment.addFilter("paginationBasePath", (pagePath: string) => {
    let basePath = pagePath.replace(/[?&]p=[^&]*/g, "");
    if (!basePath.includes("?")) {
      basePath += "?";
    }
    return basePath;
  });

  nunjucksEnvironment.addFilter("shuffle", (arr: any[]) => {
    return arr && Array.isArray(arr) ? arr.sort(() => 0.5 - Math.random()) : arr;
  });

  nunjucksEnvironment.addFilter("slug", (str: string) => {
    return slug(str);
  });

}

function constructLuxonDate(date?: string | number | Date, user?: BookshelfModel) {
  let utcLuxonDate;
  if (typeof date === "number") {
    utcLuxonDate = luxon.DateTime.fromMillis(date);
  } else if (typeof date === "string") {
    utcLuxonDate = luxon.DateTime.fromISO(date);
  } else {
    utcLuxonDate = luxon.DateTime.fromJSDate(date);
  }
  if (user && user.get("timezone")) {
    return utcLuxonDate.setZone(user.get("timezone"));
  } else {
    return utcLuxonDate;
  }
}

function formatDate(
  date: string | number | Date | undefined,
  user: BookshelfModel | undefined,
  format: string,
  options: { utcSuffixByDefault?: boolean } = { utcSuffixByDefault: true }): string {
  if (date) {
    const useDefaultTimezone = !(user && user.get("timezone"));
    const luxonDate = constructLuxonDate(date, user);
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

function ordinal(n: number): string {
  // source: https://stackoverflow.com/a/12487454
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
