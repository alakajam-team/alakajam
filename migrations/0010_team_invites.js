/**
 * Team invites
 */

exports.up = async function (knex, Promise) {
  try {
    await knex.schema.createTableIfNotExists('entry_invite', function (table) {
      table.increments('id').primary()
      table.integer('entry_id').references('entry.id').notNullable()
      table.integer('invited_user_id').references('user.id').notNullable()
      table.string('invited_user_title').notNullable()
      table.string('permission').notNullable()
      table.timestamps()
    })

    await knex.schema.table('entry', function (table) {
      // changing the "class" column name to "division" (yeah I just keep changing my mind)
      table.string('division').notNullable().defaultTo('solo').index()
    })
    await knex('entry')
      .update({
        'division': knex.raw('class')
      })
    await knex.schema.table('entry', function (table) {
      table.dropColumn('class') // changing the column name to "division" (yeah I just keep changing my mind)
    })

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    await knex.schema.dropTableIfExists('entry_invite')

    await knex.schema.table('entry', function (table) {
      table.string('class').notNullable().defaultTo('solo').index()
    })
    await knex('entry')
      .update({
        'class': knex.raw('division')
      })
    await knex.schema.table('entry', function (table) {
      table.dropColumn('division')
    })

    Promise.resolve()
  } catch (e) {
    Promise.reject(e)
  }
}
