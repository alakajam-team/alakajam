 'use strict'

/**
 * Global setting model
 *
 * @module models/setting-model
 */

 let db = require('../core/db')

 module.exports = createModel()

 function createModel () {
   let model = db.model('Setting', {
     tableName: 'setting',
     idAttribute: 'key'
   })

  /**
   * Table create
   *
   * @param {string} key Unique key
   * @param {string} value Value
   */
   model.up = async function up (currentVersion) {
     if (currentVersion < 1) {
       await db.knex.schema.createTable('setting', function (table) {
         table.string('key').primary()
         table.string('value')
       })
     }
   }

  /**
   * Table drop
   */
   model.down = async function down () {
     await db.knex.schema.dropTableIfExists('setting')
   }

   return model
 }
