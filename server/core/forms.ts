/**
 * Tools for validating, sanitizing and transforming data from forms.
 */

import * as htmlToText from "html-to-text";
import * as luxon from "luxon";
import removeMarkdown from "remove-markdown";
import sanitizeHtml from "sanitize-html";
import showdown from "showdown";
import slug from "slug";
import striptags from "striptags";
import TurndownService from "turndown";
import * as url from "url";
import * as validator from "validator";
import config from "./config";
import constants from "./constants";
import { createLuxonDate } from "./formats";

export default {
  sanitizeString,
  sanitizeMarkdown,
  sanitizeInt,

  slug: slugCustom,

  isEmail,
  isURL,
  isUsername,
  isId,
  isInt,
  isFloat,
  isSlug,
  isIn,
  isLengthValid,
  isSet,
  isNotSet,
  isPast,

  parseInt: parseIntCustom,
  parsePickerDateTime,
  parsePickerDate,
  parseJson,

  markdownToHtml,
  markdownToText,
  htmlToMarkdown,
  htmlToText: htmlToText.fromString,
};

const MAX_POSTGRESQL_INTEGER = 2147483647;
const SLUG_SETTINGS = { symbols: false };

// Libs init

const showdownLazyPicturesExt = {
  type: "output",
  filter(text) {
    if (text.includes("img")) {
      text = text.replace(/<img([^>]+)src="/g, '<img$1data-src="');
    }
    return text;
  },
};
const showdownConverter = new showdown.Converter({
  extensions: [showdownLazyPicturesExt],
});
showdownConverter.setFlavor("github");

const sanitizeHtmlOptions = {
  allowedTags: constants.ALLOWED_POST_TAGS,
  allowedAttributes: constants.ALLOWED_POST_ATTRIBUTES,
  allowedClasses: {}, // see below
  transformTags: {
    iframe: (tagName, attribs) => {
      if (attribs.src) {
        // Use cookie-free Youtube host
        attribs.src = attribs.src.replace("youtube.com", "youtube-nocookie.com");
      }
      return {
        tagName,
        attribs
      };
    }
  },
  exclusiveFilter(frame) {
    if (frame.tag === "iframe") {
      const srcUrl = url.parse(frame.attribs.src);
      return constants.ALLOWED_IFRAME_HOSTS.indexOf(srcUrl.host) === -1;
    } else {
      return false;
    }
  },
};
for (const allowedTag in constants.ALLOWED_POST_ATTRIBUTES) {
  if (constants.ALLOWED_POST_ATTRIBUTES[allowedTag].includes("class")) {
    sanitizeHtmlOptions.allowedClasses[allowedTag] = constants.ALLOWED_POST_CLASSES;
  }
}

const markdownSnippets = {
  PAYPAL_BUTTON: constants.PAYPAL_BUTTON,
};

const turndownService = new TurndownService();

/**
 * Sanitizes a string form input (by removing any tags and slicing it to the max allowed size).
 * Use this on all string input unless you need more advanced escaping (e.g. for URLs, for Markdown)
 */
function sanitizeString(str: string, options: { maxLength?: number } = {}): string {
  return striptags(str).trim().slice(0, options.maxLength || 255);
}

/**
 * Sanitizes Markdown form input very lightly, just by limiting its length.
 * Real sanitization needs to happen after converting it to HTML.
 */
function sanitizeMarkdown(markdown: string, options: { maxLength?: number } = {}): string {
  return markdown.slice(0, options.maxLength || constants.MAX_BODY_COMMENT);
}

function sanitizeInt(int: string, options: { unsigned?: boolean } = {}): number {
  const parsedInt = parseInt(int, 10);
  if (options.unsigned) {
    return Math.max(0, parsedInt);
  } else {
    return parsedInt;
  }
}

/**
 * Turns a string into a slug suitable for URLs.
 */
function slugCustom(str: string): string {
  return slug(str, SLUG_SETTINGS).toLowerCase();
}

/**
 * Checks whether the string is a valid email. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isEmail(str: string): boolean {
  return str && validator.isEmail(str);
}

/**
 * Checks whether the string is a valid URL. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isURL(str: string): boolean {
  return str && validator.isURL(str);
}

/**
 * Checks whether the string is a valid username. If so, additional sanitizing is not needed.
 * @param  {string} str
 * @return {Boolean}
 */
function isUsername(str: string): boolean {
  return str.length >= constants.USERNAME_MIN_LENGTH && /^[a-zA-Z][0-9a-zA-Z_-]+$/.test(str);
}

/**
 * Checks whether the value is a valid ID. If so, additional sanitizing is not needed.
 * @param  {string|number} value
 * @return {Boolean}
 */
function isId(value): boolean {
  return value && ((typeof value === "number" && value % 1 === 0 && value > 0 && value < MAX_POSTGRESQL_INTEGER) ||
    validator.isInt(value, { min: 1, max: MAX_POSTGRESQL_INTEGER }));
}

/**
 * Checks whether the string is a valid slug. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isSlug(str: string): boolean {
  return str && slug(str) === str;
}

/**
 * Checks whether the string is in an array of allowed values, or among the values of an object
 */
function isIn(str: string, values: string[] | Record<string, unknown>): boolean {
  if (str) {
    if (typeof values === "object") {
      return str && validator.isIn(str, Object.values(values));
    } else {
      return str && validator.isIn(str, values);
    }
  }
}

/**
 * Checks whether the string is in an integer
 */
function isInt(input: string | number, options: { min?: number; max?: number } = {}): boolean {
  return (Boolean(input) || input === 0) && validator.isInt(input.toString(), options);
}

/**
 * Checks whether the string is in a float
 */
function isFloat(input: string | number, options: { min?: number; max?: number } = {}): boolean {
  return (Boolean(input) || input === 0) && validator.isFloat(input.toString(), options);
}

/**
 * Checks whether the string is no longer than the specified length.
 * (Note: not checking this does not trigger crashes on the developer
 * H2 database, instead strings are just truncated)
 * @param  {any}  input
 * @param  {Number}  maxLength
 * @return {Boolean}
 */
function isLengthValid(input, maxLength = 255) {
  if (!input) {
    return true;
  } else if (typeof input === "string") {
    return input.length <= maxLength;
  } else if (typeof input === "object") {
    return JSON.stringify(input).length <= maxLength;
  } else {
    return input.toString().length <= maxLength;
  }
}

function isSet(input: any) {
  return input !== undefined && input.trim() !== "";
}

function isNotSet(input: any) {
  return input === undefined || input.trim() === "";
}

/**
 * Indicates if a date is already past
 * @param  {number}  time
 * @return {Boolean}
 */
function isPast(time: number) {
  return time && (new Date().getTime() - time) > 0;
}

function parseIntCustom(value: undefined | unknown, defaultValue = 0): number {
  const valueString = value?.toString();
  if (isInt(valueString)) {
    return parseInt(valueString, 10);
  } else {
    return defaultValue;
  }
}

/**
 * Converts a string built in a date time picker to an actual date
 * which can be stored in a model
 */
function parsePickerDateTime(formattedDate: string, options: luxon.DateTimeOptions = {}): Date | undefined {
  const luxonDate = createLuxonDate(formattedDate, options, constants.PICKER_DATE_TIME_FORMAT);
  return (luxonDate.isValid) ? luxonDate.toJSDate() : undefined;
}

/**
 * Converts a string built in a date picker to an actual date
 * which can be stored in a model
 */
function parsePickerDate(formattedDate: string, options: luxon.DateTimeOptions = {}): Date | undefined {
  const luxonDate = createLuxonDate(formattedDate, options, constants.PICKER_DATE_FORMAT);
  return (luxonDate.isValid) ? luxonDate.toJSDate() : undefined;
}

/**
 * Tries to parse the given JSON. By default, returns false if parsing fails
 * @param {string} str
 * @param {object} options throwError acceptInvalid
 */
function parseJson(str, options: any = {}) {
  if (!str) {
    return str;
  }

  try {
    return JSON.parse(str);
  } catch (e) {
    if (options.acceptInvalid) {
      return str;
    } else if (options.throwError) {
      throw e;
    } else {
      return false;
    }
  }
}

/**
 * Converts the given Markdown to XSS-safe HTML
 */
function markdownToHtml(markdown: string, options: { maxLength?: number; readMoreLink?: string } = {}): string {
  markdown = (markdown || "")
    // Automatically enable markdown inside HTML tags (not <p> because it messes things up)
    .replace(/< ?(div|table|tr|td|th|ul|li|h[1-5])/gi, '<$1 markdown="1" ')
    // Github-style mentions parsing
    // (adapted from https://github.com/showdownjs/showdown/blob/master/src/subParsers/makehtml/anchors.js)
    .replace(/(^|\s)(\\)?(@([a-z\d\-_]+))(?=[.!?;,'[\]()]|\s|$)/gmi, (text, st, escape, mentions, username) => {
      if (escape === "\\") {
        return st + mentions;
      } else {
        return st +
          '<a href="' + config.ROOT_URL + "/user/" + username + '">' +
          mentions.replace(/_/g, "\\_") + // Don't trigger italics tags
          "</a>";
      }
    });

  let unsafeHtml = showdownConverter.makeHtml(markdown);
  let wasTruncated = false;
  if (options.maxLength && unsafeHtml.length > options.maxLength) {
    unsafeHtml = unsafeHtml.slice(0, options.maxLength);
    wasTruncated = true;
  }

  let safeHtml = sanitizeHtml(unsafeHtml, sanitizeHtmlOptions)
    .replace(/\[\[([A-Z_].*)\]\]/g, (_, key) => {
      return markdownSnippets[key] || "[[Unknown snippet " + key + "]]";
    });

  if (wasTruncated && options.readMoreLink) {
    safeHtml = unsafeHtml.replace(/(\<\/p\>)?$/g, `... <a href="${options.readMoreLink}">(read more)</a>$1`);
  }

  return safeHtml;
}

/**
 * Converts the given Markdown to single-line text
 * @param  {string} markdown
 * @return {string} text without markup, but *should not be trusted* as safe HTML!
 */
function markdownToText(markdown: string) {
  return removeMarkdown(sanitizeMarkdown(markdown || "", { maxLength: constants.MAX_BODY_ANY })).replace(/\n\r/g, " ");
}

/**
 * Converts the given HTML string to Markdown
 * @param  {string} html
 * @return {string} Markdown
 */
function htmlToMarkdown(html) {
  return turndownService.turndown(html || "");
}
