import { BookshelfModel } from "bookshelf";
import leftPad from "left-pad";
import { User } from "server/entity/user.entity";
import constants from "./constants";
import * as formats from "./formats";
import forms from "./forms";

export function date(
  value: number | string | Date,
  user?: User,
  options: { format?: string; utcSuffixByDefault?: boolean } = {}) {
  const useCustomFormat = !!options.format;
  const format = options.format || constants.DATE_FORMAT;
  const utcSuffixByDefault = options.utcSuffixByDefault !== undefined ? options.utcSuffixByDefault : !useCustomFormat;
  return formats.formatDate(value, user, format, { utcSuffixByDefault });
}

export function dateTime(value: number | string | Date, user?: User | BookshelfModel) {
  return formats.formatDate(value, user, constants.DATE_TIME_FORMAT);
}

export function markdown(value: string, options: {maxLength?: number; readMoreLink?: string} = {}) {
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

export function dump(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export function prettyDump(obj: any) {
  return { __html: "<pre>" + dump(obj) + "</pre>" };
}

export function relativeTime(value: number | string | Date) {
  return formats.createLuxonDate(value).toRelative();
}

export function timezone(timezoneId: string) {
  // Exemple: "America/Sao_Paulo". Let's just clean up the underscores.
  return (typeof timezoneId === "string") ? timezoneId.replace(/\_/g, " ") : timezoneId;
}

export function featuredEventDateTime(value: number | string | Date, user?: User) {
  return formats.formatDate(value, user, constants.FEATURED_EVENT_DATE_FORMAT);
}

export function duration(durationInSeconds: number) {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds - minutes * 60;
  return minutes + "'" + leftPad(seconds.toFixed(3).replace(".", '"'), 6, "0");
}
