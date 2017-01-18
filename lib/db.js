'use strict'

let knex = require('knex')
let bookshelf = require('bookshelf')
let config = require('../config')
let log = require('./log')

const MODEL_FILENAMES = [
  'eventModel',
  'entryModel'
]

let knexInstance = createKnexInstance()
let db = createBookshelfInstance(knexInstance)
module.exports = db

/**
 * Knex (SQL builder) init
 */
function createKnexInstance () {
  let knexOptions = {
    client: config.DB_TYPE,
    useNullAsDefault: true,
    debug: config.DEBUG_SQL
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
  return knex(knexOptions)
}

/**
 * Bookshelf (ORM) init with custom methods:
 * - dropCreateTables
 * - insertSamples
 */
function createBookshelfInstance () {
  let db = bookshelf(knexInstance)
  db.plugin(require('bookshelf-uuid'))
  db.plugin('registry')

  db.dropCreateTables = async function () {
    for (let modelFilename of MODEL_FILENAMES) {
      log.info('Drop/create for model: ' + modelFilename + '...')
      let model = require('../models/' + modelFilename)
      await model.down()
      await model.up()
    }
  }

  db.insertSamples = async function () {
    log.info('Inserting samples...')

    let Event = require('../models/eventModel')

    let weJam1 = new Event({ title: 'WeJam #1' })
    await weJam1.save()
    let weJam1Entries = weJam1.related('entries')
    await weJam1Entries.create({ title: 'Game A' })
    await weJam1Entries.create({ title: 'Game B' })
  }

  return db
}
