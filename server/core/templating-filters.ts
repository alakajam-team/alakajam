import * as leftPad from "left-pad";
import * as lodash from "lodash";
import { User } from "server/entity/user.entity";
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

  nunjucksEnvironment.addFilter("prettyDump", (obj: string) => {
    return prettyDump(obj).__html;
  });

  nunjucksEnvironment.addFilter("markdown", (str: string, options?: object) => {
    return forms.markdownToHtml(str, options);
  });

  nunjucksEnvironment.addFilter("markdownToText", (str: string) => {
    return forms.markdownToText(str);
  });

  nunjucksEnvironment.addFilter("markdownUnescape", markdownUnescape);

  nunjucksEnvironment.addFilter("date", date);

  nunjucksEnvironment.addFilter("dateTime", dateTime);

  nunjucksEnvironment.addFilter("featuredEventDateTime", (value: number | string | Date, user?: User) => {
    return formats.formatDate(value, user, constants.FEATURED_EVENT_DATE_FORMAT);
  });

  nunjucksEnvironment.addFilter("relativeTime", relativeTime);

  nunjucksEnvironment.addFilter("duration", (durationInSeconds: number) => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds - minutes * 60;
    return minutes + "'" + leftPad(seconds.toFixed(3).replace(".", '"'), 6, "0");
  });

  nunjucksEnvironment.addFilter("timezone", timezone);

  nunjucksEnvironment.addFilter("ordinal", formats.ordinal);

  nunjucksEnvironment.addFilter("digits", digits);

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

export function date(
  value: number | string | Date,
  user?: User,
  options: { format?: string; utcSuffixByDefault?: boolean } = {}) {
  const useCustomFormat = !!options.format;
  const format = options.format || constants.DATE_FORMAT;
  const utcSuffixByDefault = options.utcSuffixByDefault !== undefined ? options.utcSuffixByDefault : !useCustomFormat;
  return formats.formatDate(value, user, format, { utcSuffixByDefault });
}

export function dateTime(value: number | string | Date, user?: User) {
  return formats.formatDate(value, user, constants.DATE_TIME_FORMAT);
}

export function markdown(value: string, options: {maxLength?: number; readMoreLink?: number} = {}) {
  return { __html: forms.markdownToHtml(value, options) };
}

export function markdownUnescape(value: string) {
  return value ? value.replace(/&amp;/g, "&").replace(/&quot;/g, '"') : null;
}

export function digits(n: string | number, fractionDigits: number) {
  if (typeof n === "string") {
    n = parseFloat(n);
  }
  if (typeof n === "number") {
    return n.toFixed(fractionDigits).toString();
  } else {
    return null;
  }
}

export function prettyDump(obj: any) {
  return { __html: "<pre>" + JSON.stringify(obj, null, 2) + "</pre>" };
}

export function relativeTime(value: number | string | Date) {
  return formats.createLuxonDate(value).toRelative();
}

export function timezone(timezoneId: string) {
  // Exemple: "America/Sao_Paulo". Let's just clean up the underscores.
  return (typeof timezoneId === "string") ? timezoneId.replace(/\_/g, " ") : timezoneId;
}
