exports.up = async function (knex, Promise) {
  await knex.schema.table('entry', function (table) {
    table.boolean('allow_anonymous')
  })

  await knex.schema.table('comment', function (table) {
    table.boolean('anonymous')
  })

}

exports.down = async function (knex, Promise) {
  await knex.schema.table('entry', function (table) {
    table.dropColumn('allow_anonymous')
  })

  await knex.schema.table('comment', function (table) {
    table.dropColumn('anonymous')
  })
}
