'use strict'

/**
 * Manipulate global settings
 *
 * @module services/setting-service
 */

const models = require('../core/models')

module.exports = {
  find,
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
  let settingModel = await models.Setting.where('key', key).fetch()
  if (settingModel) {
    return settingModel.get('value')
  } else if (typeof defaultValue === 'function') {
    return defaultValue()
  } else {
    return defaultValue
  }
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
    settingModel = new models.Setting({key: key})
    method = 'insert' // setting the ID manually makes Bookshelf assume an update
  }
  settingModel.set('value', value)
  await settingModel.save(null, {method: method})
}
