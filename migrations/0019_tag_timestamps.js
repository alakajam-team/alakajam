exports.up = async function (knex, Promise) {
  await knex.schema.table('tag', function (table) {
    table.timestamps(false, true) // Use a datetime and default to NOW()
    table.index(['created_at'])
  })
  await knex.schema.table('entry_tag', function (table) {
    table.timestamps(false, true) // Use a datetime and default to NOW()
  })

  let now = new Date()
  await knex('tag')
    .whereNull('created_at')
    .update({
      created_at: now,
      updated_at: now
    })
}

exports.down = async function (knex, Promise) {
  await knex.schema.table('tag', function (table) {
    table.dropTimestamps()
  })
  await knex.schema.table('entry_tag', function (table) {
    table.dropTimestamps()
  })
}
