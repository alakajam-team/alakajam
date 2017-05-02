'use strict'

const knex = require('knex')
const bookshelf = require('bookshelf')
const config = require('../config')
const log = require('./log')
const models = require('../models/index')

// Models sorted by table creation order
const MODEL_FILENAMES_UP = models.modelFilenamesUp()
const MODEL_FILENAMES_DOWN = MODEL_FILENAMES_UP.slice().reverse()

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
  db.plugin('pagination')

  db.isInitialized = async function () {
    try {
      await require('../models/' + MODEL_FILENAMES_UP[0]).count()
      return true
    } catch (e) {
      console.log(e)
      return false
    }
  }

  db.dropCreateTables = async function () {
    for (let modelFilename of MODEL_FILENAMES_DOWN) {
      log.info('Drop model: ' + modelFilename + '...')
      let model = require('../models/' + modelFilename)
      await model.down()
    }
    for (let modelFilename of MODEL_FILENAMES_UP) {
      log.info('Create model: ' + modelFilename + '...')
      let model = require('../models/' + modelFilename)
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
