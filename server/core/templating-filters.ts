import * as leftPad from "left-pad";
import * as luxon from "luxon";
import * as slug from "slug";
import constants from "./constants";
import forms from "./forms";

luxon.Settings.defaultZoneName = "utc";

export function configure(nunjucksEnvironment) {

  nunjucksEnvironment.addFilter("keys", (obj) => {
    return Object.keys(obj);
  });

  nunjucksEnvironment.addFilter("values", (obj) => {
    return Object.values(obj);
  });

  nunjucksEnvironment.addFilter("stringify", (obj) => {
    return JSON.stringify(obj);
  });

  nunjucksEnvironment.addFilter("pretty", (obj) => {
    if (typeof obj === "object") {
      return JSON.stringify(obj, null, 2);
    } else {
      return obj;
    }
  });

  nunjucksEnvironment.addFilter("dump", (obj) => {
    // Override default behavior to prevent escaping non-objects
    if (typeof obj === "object") {
      return JSON.stringify(obj);
    } else {
      return obj;
    }
  });

  nunjucksEnvironment.addFilter("prettyDump", (obj) => {
    return "<pre>" + JSON.stringify(obj, null, 2) + "</pre>";
  });

  nunjucksEnvironment.addFilter("markdown", (str) => {
    return forms.markdownToHtml(str);
  });

  nunjucksEnvironment.addFilter("markdownUnescape", (str) => {
    return str ? str.replace(/&amp;/g, "&").replace(/&quot;/g, '"') : null;
  });

  nunjucksEnvironment.addFilter("date", (date: Date, format?: string) => {
    if (date) {
      const formatted = luxon.DateTime.fromJSDate(date).toFormat(constants.DATE_FORMAT);
      return postProcessDateFormat(date, formatted);
    } else {
      return "";
    }
  });

  nunjucksEnvironment.addFilter("dateTime", (date) => {
    if (date) {
      const formatted = luxon.DateTime.fromJSDate(date).toFormat(constants.DATE_TIME_FORMAT);
      return postProcessDateFormat(date, formatted);
    } else {
      return "";
    }
  });

  nunjucksEnvironment.addFilter("featuredEventDateTime", (date) => {
    if (date) {
      const formatted = luxon.DateTime.fromJSDate(date).toFormat(constants.FEATURED_EVENT_DATE_FORMAT);
      return postProcessDateFormat(date, formatted) + " UTC";
    } else {
      return "";
    }
  });

  nunjucksEnvironment.addFilter("relativeTime", (date) => {
    return luxon.DateTime.fromJSDate(date).toRelative();
  });

  nunjucksEnvironment.addFilter("duration", (durationInSeconds) => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds - minutes * 60;
    return minutes + "'" + leftPad(seconds.toFixed(3).replace(".", '"'), 6, "0");
  });

  nunjucksEnvironment.addFilter("ordinal", ordinal);

  nunjucksEnvironment.addFilter("digits", (n, digits) => {
    if (typeof n === "string") {
      n = parseFloat(n);
    }
    if (typeof n === "number") {
      return n.toFixed(digits).toString();
    } else {
      return null;
    }
  });

  nunjucksEnvironment.addFilter("leftpad", (n, toLength, char) => {
    return n ? leftPad(n, toLength, char) : "";
  });

  nunjucksEnvironment.addFilter("paginationBasePath", (pagePath) => {
    let basePath = pagePath.replace(/[?&]p=[^&]*/g, "");
    if (!basePath.includes("?")) {
      basePath += "?";
    }
    return basePath;
  });

  nunjucksEnvironment.addFilter("shuffle", (arr) => {
    return arr && Array.isArray(arr) ? arr.sort(() => 0.5 - Math.random()) : arr;
  });

  nunjucksEnvironment.addFilter("slug", (str: string) => {
    return slug(str);
  });

}

function postProcessDateFormat(date: Date, formattedDate: string): string {
  return formattedDate
    .replace(constants.ORDINAL_DAY_TOKEN, ordinal(date.getDate()))
    .replace(/(AM)$/, "am")
    .replace(/(PM)$/, "pm");
}

export function ordinal(n): string {
  // source: https://stackoverflow.com/a/12487454
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
