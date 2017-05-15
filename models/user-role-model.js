 'use strict'

/**
 * UserRole model
 *
 * @module models/user-role-model
 */

 let db = require('../core/db')

 module.exports = createModel()

 function createModel () {
   let model = db.model('UserRole', {
     tableName: 'user_role',
     idAttribute: 'id',
     hasTimestamps: true,

     user: function () {
      return this.belongsTo('User', 'user_id')
     },
     node: function () {
      return this.morphTo('node', ['node_type', 'node_id'], Entry, Post)
     }
   })

   model.up = async function up (applyVersion) {
     if (applyVersion === 1) {
       await db.knex.schema.createTableIfNotExists('user_role', function (table) {
         table.increments('id').primary()
         table.integer('user_id').references('user.id')
         table.string('user_name')
         table.string('user_title')
         table.integer('node_id')
         table.string('node_type')
         table.string('permission')
         table.timestamps()
       })
     }
   }

   model.down = async function down () {
     await db.knex.schema.dropTableIfExists('user_role')
   }

   return model
 }
