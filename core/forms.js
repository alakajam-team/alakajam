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
const constants = require('../core/constants')

module.exports = {
  sanitizeString,
  sanitizeMarkdown,

  capitalize: new nunjucks.Environment().filters.capitalize,
  slug: slug,

  isEmail,
  isURL,
  isUsername,
  isId,
  isSlug,
  isIn,
  isLengthValid,

  parseDateTime,

  markdownToHtml,
  markdownToText
}

// Libs init

const showdownConverter = new showdown.Converter({
  tables: true
})
const customXss = new xss.FilterXSS({
  whiteList: Object.assign(constants.ALLOWED_POST_ATTRIBUTES, xss.whiteList)
})

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
function sanitizeMarkdown (markdown, maxLength = 10000) {
  return sanitizeHtml(markdown, {
    allowedTags: constants.ALLOWED_POST_TAGS,
    allowedAttributes: constants.ALLOWED_POST_ATTRIBUTES,
    exclusiveFilter: function (frame) {
      if (frame.tag === 'iframe') {
        let srcUrl = url.parse(frame.attribs.src)
        return constants.ALLOWED_IFRAME_HOSTS.indexOf(srcUrl.host) === -1
      } else {
        return false
      }
    }
  })
    .replace(/&gt;/g, '>') // ">"s are used in quote blocks
    .slice(0, maxLength)
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
 * Checks whether the string is a valid ID. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isId (string) {
  return string && validator.isInt(string, { min: 1 })
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
 * @param  {array(string)} values
 * @return {Boolean}
 */
function isIn (string, values) {
  return string && validator.isIn(string, values)
}

/**
 * Checks whether the string is not longer than the specified length.
 * (Note: not checking this does not trigger crashes on the developer
 * H2 database, instead strings are just truncated)
 * @param  {[type]}  input     [description]
 * @param  {Number}  maxLength [description]
 * @return {Boolean}           [description]
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
  let momentDate = moment(string, constants.PICKER_DATE_TIME_FORMAT)
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

  // Convert @mentions to links, unless we are already in a link
  let htmlSplitByLinks = html.split(/(<a .*>.*<\/a>)/g)
  let indexOutsideLinks = html.indexOf('<a ') === 0 ? 1 : 0
  while (indexOutsideLinks < htmlSplitByLinks.length) {
    htmlSplitByLinks[indexOutsideLinks] = htmlSplitByLinks[indexOutsideLinks].replace(/@([a-z\d_]+)/ig, '<a href="/user/$1">@$1</a>')
    indexOutsideLinks += 2
  }

  let htmlWithMentions = htmlSplitByLinks.join('')
  let safeHtml = customXss.process(htmlWithMentions)
  return safeHtml
}

/**
 * Converts the given Markdown to single-line text
 * @param  {string} markdown
 * @return {string}
 */
function markdownToText (markdown) {
  return removeMarkdown(sanitizeMarkdown(markdown)).replace(/\n\r/g, ' ')
}
