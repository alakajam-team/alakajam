 'use strict'

/**
 * Manipulate global settings
 *
 * @module services/setting-service
 */

 const Setting = require('../models/setting-model')

 module.exports = {
   find,
   save
 }

/**
 * Fetches a Setting and returns its value.
 * @param key {uuid} Key
 * @param default {string} An optional default value
 * @returns {void}
 */
 async function find (key, defaultValue = null) {
   let settingModel = await Setting.where('key', key).fetch()
   if (settingModel) {
     return settingModel.get('value')
   } else {
     return defaultValue
   }
 }

/**
 * Sets a Setting value.
 * @param key {uuid} Key
 * @param value {string} The new value
 * @returns {void}
 */
 async function save (key, value) {
   let settingModel = await Setting.where('key', key).fetch()
   let method = 'update'
   if (!settingModel) {
     settingModel = new Setting({key: key})
     method = 'insert' // setting the ID manually makes Bookshelf assume an update
   }
   settingModel.set('value', value)
   await settingModel.save(null, {method: method})
 }
