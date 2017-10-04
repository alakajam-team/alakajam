'use strict'

/**
 * Tools for validating, sanitizing and transforming data from forms
 *
 * @module core/forms
 */

const sanitizeHtml = require('sanitize-html')
const xss = require('xss')
const validator = require('validator')
const striptags = require('striptags')
const showdown = require('showdown')
const moment = require('moment')
const slug = require('slug')
const nunjucks = require('nunjucks')
const removeMarkdown = require('remove-markdown')
const url = require('url')
const htmlToText = require('html-to-text')
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

  markdownToHtml,
  markdownToText,
  htmlToText: htmlToText.fromString
}

const MAX_POSTGRESQL_INTEGER = 2147483647

// Libs init

const showdownConverter = new showdown.Converter({
  tables: true,
  simplifiedAutoLink: true,
  strikethrough: true,
  simpleLineBreaks: true,
  ghMentions: true,
  ghMentionsLink: config.ROOT_URL + '/user/{u}'
})
const customXss = new xss.FilterXSS({
  whiteList: Object.assign({}, xss.whiteList, constants.ALLOWED_POST_ATTRIBUTES)
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

/**
 * Sanitizes a string form input (by removing any tags and slicing it to the max allowed size).
 * If the string is meant for anything other than direct display (e.g. links, markdown...)
 * then this is not the right filter.
 * Use this on all string input unless you need more advanced escaping (e.g. for URLs, for Markdown)
 * @param  {string} string
 * @param  {string} maxLength
 * @return {string}
 */
function sanitizeString (string, maxLength = 255) {
  return striptags(string).trim().slice(0, maxLength)
}

/**
 * Sanitizes Markdown form input (by fixing/stripping any embedded HTML tags)
 * @param  {string} markdown
 * @return {string}
 */
function sanitizeMarkdown (markdown, maxLength = constants.MAX_BODY_COMMENT) {
  return sanitizeHtml(markdown, sanitizeHtmlOptions)
    .replace(/&gt;/g, '>') // ">"s are used in quote blocks
    .slice(0, maxLength)
}

/**
 * Turns a string into a slug suitable for URLs.
 */
function _slug (string) {
  return slug(string).toLowerCase()
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
  if (typeof values === 'object') {
    return string && validator.isIn(string, Object.values(values))
  }
  return string && validator.isIn(string, values)
}

/**
 * Checks whether the string is in an integer
 * @param  {string} string
 * @return {Boolean}
 */
function isInt (string) {
  return string && validator.isInt(string)
}

/**
 * Checks whether the string is in a float
 * @param  {string} string
 * @return {Boolean}
 */
function isFloat (string) {
  return string && validator.isFloat(string)
}

/**
 * Checks whether the string is not longer than the specified length.
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
    return ''
  }
}

/**
 * Converts the given Markdown to XSS-safe HTML
 * @param  {string} markdown
 * @return {string}
 */
function markdownToHtml (markdown) {
  let html = showdownConverter.makeHtml(markdown)
  let safeHtml = customXss.process(html)
  return safeHtml
}

/**
 * Converts the given Markdown to single-line text
 * @param  {string} markdown
 * @return {string}
 */
function markdownToText (markdown) {
  return removeMarkdown(sanitizeMarkdown(markdown, constants.MAX_BODY_ANY)).replace(/\n\r/g, ' ')
}
