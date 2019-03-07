'use strict'

/**
 * Tools for validating, sanitizing and transforming data from forms
 *
 * @module core/forms
 */

const sanitizeHtml = require('sanitize-html')
const validator = require('validator')
const striptags = require('striptags')
const showdown = require('showdown')
const moment = require('moment')
const slug = require('slug')
const nunjucks = require('nunjucks')
const removeMarkdown = require('remove-markdown')
const url = require('url')
const htmlToText = require('html-to-text')
const TurndownService = require('turndown')
const constants = require('../core/constants')
const config = require('../config')

module.exports = {
  sanitizeString,
  sanitizeMarkdown,

  capitalize: new nunjucks.Environment().filters.capitalize,
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

  parseDateTime,
  parseJson,

  markdownToHtml,
  markdownToText,
  htmlToMarkdown,
  htmlToText: htmlToText.fromString
}

const MAX_POSTGRESQL_INTEGER = 2147483647
const SLUG_SETTINGS = { symbols: false }

// Libs init

const showdownLazyPicturesExt = {
  type: 'output',
  filter: function (text, _converter, _options) {
    if (text.includes('img')) {
      text = text.replace(/<img([^>]+)src="/g, '<img$1data-src="')
    }
    return text
  }
}
const showdownConverter = new showdown.Converter({
  tables: true,
  simplifiedAutoLink: true,
  strikethrough: true,
  simpleLineBreaks: true,
  extensions: [showdownLazyPicturesExt]
})

const sanitizeHtmlOptions = {
  allowedTags: constants.ALLOWED_POST_TAGS,
  allowedAttributes: constants.ALLOWED_POST_ATTRIBUTES,
  allowedClasses: {}, // see below
  exclusiveFilter: function (frame) {
    if (frame.tag === 'iframe') {
      let srcUrl = url.parse(frame.attribs.src)
      return constants.ALLOWED_IFRAME_HOSTS.indexOf(srcUrl.host) === -1
    } else {
      return false
    }
  }
}
for (let allowedTag in constants.ALLOWED_POST_ATTRIBUTES) {
  if (constants.ALLOWED_POST_ATTRIBUTES[allowedTag].includes('class')) {
    sanitizeHtmlOptions.allowedClasses[allowedTag] = constants.ALLOWED_POST_CLASSES
  }
}

const markdownSnippets = {
  PAYPAL_BUTTON: constants.PAYPAL_BUTTON
}

const turndownService = new TurndownService()

/**
 * Sanitizes a string form input (by removing any tags and slicing it to the max allowed size).
 * Use this on all string input unless you need more advanced escaping (e.g. for URLs, for Markdown)
 * @param  {string} string
 * @param  {object} options maxLength
 * @return {string}
 */
function sanitizeString (string, options = {}) {
  return striptags(string).trim().slice(0, options.maxLength || 255)
}

/**
 * Sanitizes Markdown form input very lightly, just by limiting its length.
 * Real sanitization needs to happen after converting it to HTML.
 * @param  {string} markdown
 * @param  {object} options maxLength
 * @return {string}
 */
function sanitizeMarkdown (markdown, options = {}) {
  return markdown.slice(0, options.maxLength || constants.MAX_BODY_COMMENT)
}

/**
 * Turns a string into a slug suitable for URLs.
 */
function _slug (string) {
  return slug(string, SLUG_SETTINGS).toLowerCase()
}

/**
 * Checks whether the string is a valid email. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isEmail (string) {
  return string && validator.isEmail(string)
}

/**
 * Checks whether the string is a valid URL. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isURL (string) {
  return string && validator.isURL(string)
}

/**
 * Checks whether the string is a valid username. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isUsername (string) {
  return string.length >= 3 && /^[a-zA-Z][0-9a-zA-Z_-]+$/.test(string)
}

/**
 * Checks whether the value is a valid ID. If so, additional sanitizing is not needed.
 * @param  {string|number} value
 * @return {Boolean}
 */
function isId (value) {
  return value && ((typeof value === 'number' && value % 1 === 0 && value > 0 && value < MAX_POSTGRESQL_INTEGER) ||
      validator.isInt(value, { min: 1, max: MAX_POSTGRESQL_INTEGER }))
}

/**
 * Checks whether the string is a valid slug. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isSlug (string) {
  return string && slug(string) === string
}

/**
 * Checks whether the string is in an array of allowed values
 * @param  {string} string
 * @param  {array(string)|object} values
 * @return {Boolean}
 */
function isIn (string, values) {
  if (string) {
    if (typeof values === 'object') {
      return string && validator.isIn(string, Object.values(values))
    } else {
      return string && validator.isIn(string, values)
    }
  }
}

/**
 * Checks whether the string is in an integer
 * @param  {string|number} string
 * @param  {object} options (optional) min max lt gt
 * @return {Boolean}
 */
function isInt (input, options = {}) {
  return (input || input === 0) && ((typeof input === 'number' && Number.isInteger(input)) ||
    validator.isInt(input, options))
}

/**
 * Checks whether the string is in a float
 * @param  {string|number} string
 * @param  {object} options (optional) min max lt gt
 * @return {Boolean}
 */
function isFloat (input, options = {}) {
  return (input || input === 0) && (typeof input === 'number' || validator.isFloat(input, options))
}

/**
 * Checks whether the string is no longer than the specified length.
 * (Note: not checking this does not trigger crashes on the developer
 * H2 database, instead strings are just truncated)
 * @param  {any}  input
 * @param  {Number}  maxLength
 * @return {Boolean}
 */
function isLengthValid (input, maxLength = 255) {
  if (!input) {
    return true
  } else if (typeof input === 'string') {
    return input.length <= maxLength
  } else if (typeof input === 'object') {
    return JSON.stringify(input).length <= maxLength
  } else {
    return input.toString().length <= maxLength
  }
}

/**
 * Converts a string built in a date time picker to an actual date
 * which can be stored in a model
 */
function parseDateTime (string) {
  let momentDate = moment.utc(string, constants.PICKER_DATE_TIME_FORMAT)
  if (momentDate.isValid()) {
    return momentDate.toDate()
  } else {
    return null
  }
}

/**
 * Tries to parse the given JSON. By default, returns false if parsing fails
 * @param {string} string
 * @param {object} options throwError acceptInvalid
 */
function parseJson (string, options = {}) {
  if (!string) {
    return string
  }

  try {
    return JSON.parse(string)
  } catch (e) {
    if (options.acceptInvalid) {
      return string
    } else if (options.throwError) {
      throw e
    } else {
      return false
    }
  }
}

/**
 * Converts the given Markdown to XSS-safe HTML
 * @param  {string} markdown
 * @return {string}
 */
function markdownToHtml (markdown) {
  // Github-style mentions parsing
  // (adapted from https://github.com/showdownjs/showdown/blob/master/src/subParsers/makehtml/anchors.js)
  markdown = (markdown || '').replace(/(^|\s)(\\)?(@([a-z\d\-_]+))(?=[.!?;,'[\]()]|\s|$)/gmi, function (wm, st, escape, mentions, username) {
    if (escape === '\\') {
      return st + mentions
    } else {
      return st +
        '<a href="' + config.ROOT_URL + '/user/' + username + '">' +
        mentions.replace(/_/g, '\\_') + // Don't trigger italics tags
        '</a>'
    }
  })

  const unsafeHtml = showdownConverter.makeHtml(markdown)
  const safeHtml = sanitizeHtml(unsafeHtml, sanitizeHtmlOptions)
    .replace(/\[\[([A-Z_].*)\]\]/g, (_match, key) => {
      return markdownSnippets[key] || '[[Unknown snippet ' + key + ']]'
    })
  return safeHtml
}

/**
 * Converts the given Markdown to single-line text
 * @param  {string} markdown
 * @return {string} text without markup, but *should not be trusted* as safe HTML!
 */
function markdownToText (markdown) {
  return removeMarkdown(sanitizeMarkdown(markdown || '', constants.MAX_BODY_ANY)).replace(/\n\r/g, ' ')
}

/**
 * Converts the given HTML string to Markdown
 * @param  {string} html
 * @return {string} Markdown
 */
function htmlToMarkdown (html) {
  return turndownService.turndown(html || '')
}
