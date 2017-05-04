'use strict'

/**
 * Database storage configuration.
 * Requiring the module returns a [Bookshelf](http://bookshelfjs.org/) instance.
 * 
 * @module core/db
 */

const knex = require('knex')
const bookshelf = require('bookshelf')
const config = require('../config')
const log = require('./log')
const models = require('../models/index')

module.exports = initializeDatabase()

// Models sorted by table creation order
const MODEL_FILENAMES_UP = models.modelFilenamesUp()
const MODEL_FILENAMES_DOWN = MODEL_FILENAMES_UP.slice().reverse()

function initializeDatabase () {
  let knexInstance = createKnexInstance()
  return createBookshelfInstance(knexInstance)
}

/*
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

/*
 * Bookshelf (ORM) init with custom methods.
 */
function createBookshelfInstance (knexInstance) {
  let db = bookshelf(knexInstance)
  db.plugin(require('bookshelf-uuid'))
  db.plugin('registry')
  db.plugin('pagination')

  /**
   * Checks whether the database has been initialized
   * @returns {boolean}
   */
  db.isInitialized = async function () {
    try {
      await require('../models/' + MODEL_FILENAMES_UP[0]).count()
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Recreates the whole database.
   * @returns {void}
   */
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

  /**
   * Inserts sample data in the database.
   * @returns {void}
   */
  db.insertSamples = async function () {
    log.info('Inserting samples...')

    let Event = require('../models/event-model')

    let weJam1 = new Event({
      title: '1st WeJam',
      status_global: 'closed'
    })
    await weJam1.save()

    let weJam1Entries = weJam1.related('entries')
    await weJam1Entries.create({ title: 'Old Game' })

    let weJam2 = new Event({
      title: '2nd WeJam',
      status_global: 'open'
    })
    await weJam2.save()

    let weJam2Entries = weJam2.related('entries')
    await weJam2Entries.create({ title: 'Game A' })
    await weJam2Entries.create({ title: 'Game B' })
  }

  return db
}
