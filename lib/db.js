'use strict'

let knex = require('knex')
let bookshelf = require('bookshelf')
let config = require('../config')
let log = require('./log')

// Knex (SQL builder) init
// ---------------------

let knexOptions = {
  client: config.DB_TYPE,
  useNullAsDefault: true
}

if (config.DB_TYPE === 'sqlite3') {
  knexOptions.connection = {
    filename: config.DB_SQLITE_FILENAME
  }
} else {
  knexOptions.connection = {
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    charset: 'utf8'
  }
}

let knexInstance = knex(knexOptions)

// Bookshelf (ORM) init
// ---------------------

let db = bookshelf(knexInstance)
db.plugin(require('bookshelf-uuid'))
db.plugin('registry')

// Custom extensions
// -----------------

// Re-create all tables
db.dropCreateTables = async function () {
  const modelFilenames = ['event', 'entry']
  for (let modelFilename of modelFilenames) {
    log.info('Drop/create for model: ' + modelFilename + '...')
    let model = require('../models/' + modelFilename)
    await model.down()
    await model.up()
  }
}

db.insertSamples = async function () {
  log.info('Inserting samples...')

  let Event = require('../models/event')

  // FIXME entries are not attached to the event
  let weJam1 = new Event({ title: 'WeJam #1' })
  let weJam1Entries = weJam1.related('entries')
  await weJam1Entries.create({ title: 'Game A' })
  await weJam1Entries.create({ title: 'Game B' })
  await weJam1.save()
}

module.exports = db
