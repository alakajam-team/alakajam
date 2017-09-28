'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const constants = require('../core/constants')
const log = require('../core/log')
const cache = require('../core/cache')
const requestPromise = require('request-promise-native')
const fs = require('../core/file-storage')

module.exports = {
  findArticle
}

/**
 * Finds one article by its name
 * @param  {string} article name (slug)
 * @return {string} markdown content
 */
async function findArticle (articleName) {
  return fs.read('articles/' + articleName + '.md')
  return cache.getOrFetch(cache.articles, articleName, async function () {
    let result = null
    try {
      result = await requestPromise(constants.ARTICLES_ROOT_URL + articleName + '.md')
    } catch (e) {
      log.warn('Article not found: ' + articleName)
    }
    return result
  })
}
