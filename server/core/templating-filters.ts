import * as leftPad from "left-pad";
import * as moment from "moment";
import * as slug from "slug";
import constants from "./constants";
import forms from "./forms";

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

  nunjucksEnvironment.addFilter("date", (date, format) => {
    if (date) {
      return moment(date).utc().format(format || constants.DATE_FORMAT);
    } else {
      return "";
    }
  });

  nunjucksEnvironment.addFilter("dateTime", (date) => {
    if (date) {
      return moment(date).utc().format(constants.DATE_TIME_FORMAT);
    } else {
      return "";
    }
  });

  nunjucksEnvironment.addFilter("featuredEventDateTime", (date) => {
    if (date) {
      return moment(date).utc().format(constants.FEATURED_EVENT_DATE_FORMAT) + " UTC";
    } else {
      return "";
    }
  });

  nunjucksEnvironment.addFilter("relativeTime", (date) => {
    return moment(date).utc().fromNow();
  });
  nunjucksEnvironment.addFilter("duration", (durationInSeconds) => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds - minutes * 60;
    return minutes + "'" + leftPad(seconds.toFixed(3).replace(".", '"'), 6, "0");
  });

  nunjucksEnvironment.addFilter("ordinal", (n) => {
    // source: https://stackoverflow.com/a/12487454
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  });

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
