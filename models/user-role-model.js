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
      return this.belongsTo('User', 'user_uuid')
     },
     node: function () {
      return this.morphTo('node', ['node_type', 'node_uuid'], Entry)
     }
   })

   model.up = async function up (currentVersion) {
     if (currentVersion < 1) {
       await db.knex.schema.createTableIfNotExists('user_role', function (table) {
         table.increments('id').primary()
         table.uuid('user_uuid').references('user.uuid')
         table.string('user_title')
         table.uuid('node_uuid')
         table.string('node_type')
         table.string('role')
         table.timestamps()
       })
     }
   }

   model.down = async function down () {
     await db.knex.schema.dropTableIfExists('user_role')
   }

   return model
 }
