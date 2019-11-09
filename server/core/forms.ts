/**
 * Tools for validating, sanitizing and transforming data from forms
 *
 * @module core/forms
 */

import * as htmlToText from "html-to-text";
import * as moment from "moment";
import * as nunjucks from "nunjucks";
import * as removeMarkdown from "remove-markdown";
import * as sanitizeHtml from "sanitize-html";
import * as showdown from "showdown";
import * as slug from "slug";
import * as striptags from "striptags";
import * as TurndownService from "turndown";
import * as url from "url";
import * as validator from "validator";
import config from "./config";
import constants from "./constants";

export default {
  sanitizeString,
  sanitizeMarkdown,

  capitalize: (new nunjucks.Environment() as any).filters.capitalize,
  slug: _slug,

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

  parseDateTime,
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
 * @param  {string} string
 * @param  {object} options maxLength
 * @return {string}
 */
function sanitizeString(str: string, options: any = {}) {
  return striptags(str).trim().slice(0, options.maxLength || 255);
}

/**
 * Sanitizes Markdown form input very lightly, just by limiting its length.
 * Real sanitization needs to happen after converting it to HTML.
 * @param  {string} markdown
 * @param  {object} options maxLength
 * @return {string}
 */
function sanitizeMarkdown(markdown: string, options: any = {}) {
  return markdown.slice(0, options.maxLength || constants.MAX_BODY_COMMENT);
}

/**
 * Turns a string into a slug suitable for URLs.
 */
function _slug(str: string) {
  return slug(str, SLUG_SETTINGS).toLowerCase();
}

/**
 * Checks whether the string is a valid email. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isEmail(str: string) {
  return str && validator.isEmail(str);
}

/**
 * Checks whether the string is a valid URL. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isURL(str: string) {
  return str && validator.isURL(str);
}

/**
 * Checks whether the string is a valid username. If so, additional sanitizing is not needed.
 * @param  {string} str
 * @return {Boolean}
 */
function isUsername(str) {
  return str.length >= 3 && /^[a-zA-Z][0-9a-zA-Z_-]+$/.test(str);
}

/**
 * Checks whether the value is a valid ID. If so, additional sanitizing is not needed.
 * @param  {string|number} value
 * @return {Boolean}
 */
function isId(value) {
  return value && ((typeof value === "number" && value % 1 === 0 && value > 0 && value < MAX_POSTGRESQL_INTEGER) ||
    validator.isInt(value, { min: 1, max: MAX_POSTGRESQL_INTEGER }));
}

/**
 * Checks whether the string is a valid slug. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isSlug(str: string) {
  return str && slug(str) === str;
}

/**
 * Checks whether the string is in an array of allowed values
 * @param  {string} string
 * @param  {array(string)|object} values
 * @return {Boolean}
 */
function isIn(str, values) {
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
 * @param  {string|number} string
 * @param  {object} options (optional) min max lt gt
 * @return {Boolean}
 */
function isInt(input, options: any = {}) {
  return (input || input === 0) && ((typeof input === "number" && Number.isInteger(input)) ||
    validator.isInt(input, options));
}

/**
 * Checks whether the string is in a float
 * @param  {string|number} string
 * @param  {object} options (optional) min max lt gt
 * @return {Boolean}
 */
function isFloat(input, options: any = {}) {
  return (input || input === 0) && (typeof input === "number" || validator.isFloat(input, options));
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

/**
 * Converts a string built in a date time picker to an actual date
 * which can be stored in a model
 */
function parseDateTime(str) {
  const momentDate = moment.utc(str, constants.PICKER_DATE_TIME_FORMAT);
  if (momentDate.isValid()) {
    return momentDate.toDate();
  } else {
    return null;
  }
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
 * @param  {string} markdown
 * @return {string}
 */
function markdownToHtml(markdown: string) {
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

  const unsafeHtml = showdownConverter.makeHtml(markdown);
  const safeHtml = sanitizeHtml(unsafeHtml, sanitizeHtmlOptions)
    .replace(/\[\[([A-Z_].*)\]\]/g, (_, key) => {
      return markdownSnippets[key] || "[[Unknown snippet " + key + "]]";
    });
  return safeHtml;
}

/**
 * Converts the given Markdown to single-line text
 * @param  {string} markdown
 * @return {string} text without markup, but *should not be trusted* as safe HTML!
 */
function markdownToText(markdown) {
  return removeMarkdown(sanitizeMarkdown(markdown || "", constants.MAX_BODY_ANY)).replace(/\n\r/g, " ");
}

/**
 * Converts the given HTML string to Markdown
 * @param  {string} html
 * @return {string} Markdown
 */
function htmlToMarkdown(html) {
  return turndownService.turndown(html || "");
}
