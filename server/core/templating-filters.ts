import { BookshelfModel } from "bookshelf";
import * as leftPad from "left-pad";
import * as lodash from "lodash";
import * as slug from "slug";
import constants from "./constants";
import * as formats from "./formats";
import forms from "./forms";

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
    return formats.formatDate(date, user, format, { utcSuffixByDefault });
  });

  nunjucksEnvironment.addFilter("dateTime", (date: number | string | Date, user?: BookshelfModel) => {
    return formats.formatDate(date, user, constants.DATE_TIME_FORMAT);
  });

  nunjucksEnvironment.addFilter("featuredEventDateTime", (date: number | string | Date, user?: BookshelfModel) => {
    return formats.formatDate(date, user, constants.FEATURED_EVENT_DATE_FORMAT);
  });

  nunjucksEnvironment.addFilter("relativeTime", (date: number | string | Date) => {
    return formats.createLuxonDate(date).toRelative();
  });

  nunjucksEnvironment.addFilter("duration", (durationInSeconds: number) => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds - minutes * 60;
    return minutes + "'" + leftPad(seconds.toFixed(3).replace(".", '"'), 6, "0");
  });

  nunjucksEnvironment.addFilter("timezone", (timezoneId: string) => {
    // Exemple: "America/Sao_Paulo". Let's just clean up the underscores.
    return (typeof timezoneId === "string") ? timezoneId.replace(/\_/g, " ") : timezoneId;
  });

  nunjucksEnvironment.addFilter("ordinal", formats.ordinal);

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
    return arr && Array.isArray(arr) ? lodash.shuffle(arr) : arr;
  });

  nunjucksEnvironment.addFilter("slug", (str: string) => {
    return slug(str);
  });

}
