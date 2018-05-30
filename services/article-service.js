'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const promisify = require('promisify-node')
const path = promisify('path')
const fs = promisify('fs')
const requestPromise = require('request-promise-native')
const constants = require('../core/constants')
const log = require('../core/log')
const cache = require('../core/cache')
const config = require('../config')

module.exports = {
  findArticle
}

/**
 * Finds one article by its name
 * @param  {string} article name (slug)
 * @return {string} markdown content
 */
async function findArticle (articleName) {
  if (config.DEBUG_ARTICLES) {
    let article = await fs.readFile(path.join(__dirname, '../articles', articleName + '.md'))
    if (article) {
      return article.toString()
    }
  } else {
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
}
