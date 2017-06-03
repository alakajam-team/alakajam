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
const constants = require('../core/constants')

module.exports = {
  sanitizeString,
  sanitizeMarkdown,

  isEmail,
  isURL,
  isUsername,

  markdownToHtml
}

// Libs init
const showdownConverter = new showdown.Converter()

/**
 * Sanitizes a string form input (by removing any tags).
 * If the string is meant for anything other than direct display (e.g. links, markdown...)
 * then this is not the right filter.
 * Use this on all string input unless you need more advanced escaping (e.g. for URLs, for Markdown)
 * @param  {string} string
 * @return {string}
 */
function sanitizeString (string) {
  return striptags(string)
}

/**
 * Sanitizes Markdown form input (by fixing/stripping any embedded HTML tags)
 * @param  {string} markdown
 * @return {string}
 */
function sanitizeMarkdown (markdown) {
  return sanitizeHtml(markdown, {
    allowedTags: constants.ALLOWED_POST_TAGS,
    allowedAttributes: constants.ALLOWED_POST_ATTRIBUTES
  })
}

/**
 * Checks whether the string is a valid email. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isEmail (string) {
  return validator.isEmail(string)
}

/**
 * Checks whether the string is a valid URL. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isURL (string) {
  return validator.isURL(string)
}

/**
 * Checks whether the string is a valid username. If so, additional sanitizing is not needed.
 * @param  {string} string
 * @return {Boolean}
 */
function isUsername (username) {
  return username.length >= 3 && /^[a-zA-Z][0-9a-zA-Z_-]+$/.test(username)
}

/**
 * Converts the given Markdown to XSS-safe HTML
 * @param  {string} markdown
 * @return {string}
 */
function markdownToHtml (markdown) {
  return xss(showdownConverter.makeHtml(markdown))
}
