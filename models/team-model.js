 'use strict'

/**
 * Team model
 *
 * @module models/team-model
 */

 let db = require('../core/db')

 module.exports = createModel()

 function createModel () {
   let model = db.model('Team', {
     tableName: 'team',
     idAttribute: 'uuid',
     hasTimestamps: true,
     uuid: true
   })

   model.up = async function up (currentVersion) {
     if (currentVersion < 1) {
       await db.knex.schema.createTableIfNotExists('team', function (table) {
         table.uuid('uuid').primary()
         table.uuid('owning_user_uuid').references('user.uuid')
         table.string('title')
         table.uuid('guild_uuid')// .references('guild.uuid')
         table.string('body')
         table.timestamps()
       })
     }
   }

   model.down = async function down () {
     await db.knex.schema.dropTableIfExists('team')
   }

   return model
 }
