'use strict'

/**
 * Manipulate global settings
 *
 * @module services/setting-service
 */

const constants = require('../core/constants')
const models = require('../core/models')
const cache = require('../core/cache')
const log = require('../core/log')

module.exports = {
  find,
  findArticlesSidebar,
  save
}

/**
 * Fetches a Setting and returns its value.
 * @param key {id} Key
 * @param default {string|function} An optional default value.
 *   If a function is passed, it will be evaluated first.
 * @returns {void}
 */
async function find (key, defaultValue = null) {
  if (!cache.settings.get(key)) {
    if (!key) {
      throw new Error('Undefined key, you might have forgotten to declare a constant')
    }
    let settingModel = await models.Setting.where('key', key).fetch()
    cache.settings.set(key, settingModel ? settingModel.get('value') : undefined)
  }
  let value = cache.settings.get(key)
  if (value) {
    return value
  } else if (typeof defaultValue === 'function') {
    return defaultValue()
  } else {
    return defaultValue
  }
}

async function findArticlesSidebar (key, defaultValue = null) {
  let articlesSidebar = await find(constants.SETTING_ARTICLE_SIDEBAR)
  if (articlesSidebar) {
    try {
      return JSON.parse(articlesSidebar).sidebar
    } catch (e) {
      log.error("Malformed JSON. Can't load articles links")
    }
  }
  return null
}

/**
 * Sets a Setting value.
 * @param key {id} Key
 * @param value {string} The new value
 * @returns {void}
 */
async function save (key, value) {
  let settingModel = await models.Setting.where('key', key).fetch()
  let method = 'update'
  if (!settingModel) {
    settingModel = new models.Setting({ key: key })
    method = 'insert' // setting the ID manually makes Bookshelf assume an update
  }
  settingModel.set('value', value)
  await settingModel.save(null, { method: method })
  cache.settings.del(key)
}
