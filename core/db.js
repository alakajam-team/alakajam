'use strict'

/**
 * Database storage configuration.
 * Requiring the module returns a [Bookshelf](http://bookshelfjs.org/) instance.
 *
 * @module core/db
 */

const knex = require('knex')
const bookshelf = require('bookshelf')
const moment = require('moment')
const promisify = require('promisify-node')
const fs = promisify('fs')
const path = require('path')
const config = require('../config')
const constants = require('../core/constants')
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
      filename: path.join(__dirname, '..', config.DB_SQLITE_FILENAME)
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
  db.plugin('registry')
  db.plugin('pagination')
  db.plugin(require('bookshelf-cascade-delete'))

  /**
   * Finds the current DB version
   * @returns {number} The DB version, or 0 if the DB is empty
   */
  db.findCurrentVersion = async function () {
    const settingService = require('../services/setting-service')
    try {
      return await settingService.find(constants.SETTING_DB_VERSION, 0)
    } catch (e) {
      // Table missing
      return 0
    }
  }

  /**
   * Drops all tables from the database.
   * @returns {void}
   */
  db.dropTables = async function () {
    for (let modelFilename of MODEL_FILENAMES_DOWN) {
      log.info('Drop model: ' + modelFilename + '...')
      let model = require('../models/' + modelFilename)
      await model.down()
    }
  }

  /**
   * Upgrades the whole database to the latest version.
   * Creates the tables if needed.
   * @param {boolean} silent Whether to log DB upgrades
   * @returns {void}
   */
  db.upgradeTables = async function (silent) {
    let currentVersion = await db.findCurrentVersion()
    let upgradeRequired = currentVersion < models.version

    // Load all models modules
    let modelModules = {}
    for (let modelFilename of MODEL_FILENAMES_UP) {
      modelModules[modelFilename] = require('../models/' + modelFilename)
    }

    // Upgrade models if needed
    while (currentVersion < models.version) {
      let nextVersion = currentVersion + 1
      for (let modelFilename of MODEL_FILENAMES_UP) {
        if (!silent) {
          log.info('Upgrade model: ' + modelFilename + ' to version ' + nextVersion + '...')
        }
        await modelModules[modelFilename].up(nextVersion)
      }
      currentVersion = nextVersion
    }

    if (upgradeRequired) {
      const settingService = require('../services/setting-service')
      await settingService.save(constants.SETTING_DB_VERSION, models.version)
    }
  }

  /**
   * Inserts sample data in the database.
   * @param {bool|string} samples true to add samples, 'nightly' to add the special nighly post
   * @returns {void}
   */
  db.insertInitialData = async function (samples) {
    const userService = require('../services/user-service')
    const Event = require('../models/event-model')
    const eventService = require('../services/event-service')
    const postService = require('../services/post-service')

    // Mandatory admin account

    await userService.register('administrator', 'administrator')
    let adminUser = await userService.findByName('administrator')
    adminUser.set({
      'title': 'Administrator',
      is_admin: true
    })
    await adminUser.save()

    // Samples

    if (samples) {
      log.info('Inserting samples...')

      await userService.register('entrant', 'entrant')
      let entrantUser = await userService.findByName('entrant')
      entrantUser.set({
        'title': 'Entrant',
        'body': 'I am definitely **not** a robot.'
      })
      await entrantUser.save()

      // 1st event

      let event1 = new Event({
        title: '1st Alakajam',
        name: '1st-alakajam',
        status: 'closed',
        display_dates: 'Novembary 17 - 20, 2016',
        display_theme: 'Make a website',
        status_theme: 'disabled',
        status_entry: 'on',
        status_results: 'disabled'
      })
      await event1.save()
      let userEntry = await eventService.createEntry(entrantUser, event1)
      userEntry.set('title', 'Old Game')
      await userEntry.save()

      // 2nd event

      let event2 = new Event({
        title: '2nd Alakajam',
        name: '2nd-alakajam',
        status: 'open',
        display_dates: 'Januember 29 - 31, 2017',
        display_theme: 'You are not alone',
        status_theme: 'disabled',
        status_entry: 'on',
        status_results: 'off'
      })
      await event2.save()

      let adminEntry = await eventService.createEntry(adminUser, event1)
      adminEntry.set('title', 'Super Game')
      await adminEntry.save()
      userEntry = await eventService.createEntry(entrantUser, event2)
      userEntry.set('title', 'Awesome Game')
      await userEntry.save()

      let post = await postService.createPost(entrantUser)
      post.set({
        title: "I'm in!",
        body: "This is my second game and I'm really excited.",
        event_id: event2.get('id'),
        entry_id: userEntry.get('id'),
        published_at: new Date()
      })
      await post.save()

      post = await postService.createPost(adminUser)
      post.set({
        title: 'Event started!',
        body: 'The theme is `You are not alone`. Have fun!',
        event_id: event2.get('id'),
        special_post_type: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
        published_at: new Date()
      })
      if (samples === 'nightly') {
        let changesBuffer = await fs.readFile(path.join(__dirname, '../tests/nightly/CHANGES.md'))
        post.set({
          title: 'Nightly: ' + moment().format('MMMM Do YYYY'),
          body: changesBuffer.toString()
        })
      }
      await post.save()

      await postService.createComment(entrantUser, post, 'Seriously? We already had this theme twice')
      await postService.refreshCommentCount(post)

      // Planned 3rd event

      let event3 = new Event({
        title: '3rd Alakajam',
        name: '3rd-alakajam',
        status: 'pending',
        display_dates: 'Marchpril 5 - 8, 2017',
        status_theme: 'off',
        status_entry: 'off',
        status_results: 'off'
      })
      await event3.save()
    }
  }

  return db
}
