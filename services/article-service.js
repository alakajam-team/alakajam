'use strict'

/**
 * Blog post service.
 *
 * @module services/post-service
 */

const config = require('../config')
const fileStorage = require('../core/file-storage')

module.exports = {
  findArticle
}

/**
 * Finds one article by its name
 * @param  {string} article name (slug)
 * @return {string} markdown content
 */
async function findArticle (articleName) {
  let path = 'articles/' + articleName + '.md'
  let exists = await fileStorage.exists(path)
  if (exists) {
    return fileStorage.read(path)
  } else {
    return null
  }
}
