'use strict'

/**
 * Entry point for the Alakajam! server
 *
 * @description
 * Starts the Node server
 *
 * @module server
 */

let log
try {
  log = global.log = require('./core/log')
  log.info('Starting server...')
} catch (e) {
  console.error('Failed to start the server: ' + e.message)
  console.error('Did you run "npm install"?')
  process.exit(1)
}

const promisify = require('promisify-node')
const fs = promisify('fs')
const path = require('path')
const express = require('express')
const browserRefreshClient = require('browser-refresh-client')

createApp()

/*
 * Create, configure and launch the server
 */
async function createApp () {
  catchErrorsAndSignals()
  await initFilesLayout()

  const middleware = require('./core/middleware')
  const config = require('./config')

  let app = express()
  // Check whether 'development' is on, rather than whether 'production' is
  // off, so we don't leak stack traces in case production is ever
  // misconfigured to leave this undefined.
  app.locals.devMode = app.get('env') === 'development'
  await initDatabase(app.locals.devMode && config.DEBUG_INSERT_SAMPLES)
  await middleware.configure(app)
  app.listen(config.SERVER_PORT, configureBrowserRefresh)
  log.info('Server started on port ' + config.SERVER_PORT + '.')
}

/*
 * Catch unhandled errors and system signals
 */
function catchErrorsAndSignals () {
  // Display unhandled rejections more nicely
  process.on('unhandledException', (e) => {
    log.error('Unhandled promise rejection:', e)
    _doGracefulShutdown()
  })
  process.on('unhandledRejection', (reason, p) => {
    log.error('Unhandled promise rejection:', p)
  })

  // Stop the server gracefully upon shut down signals
  let alreadyShuttingDown = false
  let signals = ['SIGINT', 'SIGQUIT', 'SIGTERM']
  signals.forEach((signal) => {
    process.on(signal, _doGracefulShutdown)
  })
  function _doGracefulShutdown (cb) {
    if (!alreadyShuttingDown) {
      alreadyShuttingDown = true
      const db = require('./core/db')
      log.info('Shutting down.')
      db.knex.destroy(() => process.exit(-1))
    }
  }
}

/*
 * Initialize files upon first startup
 */
async function initFilesLayout () {
  // Create config.js if missing
  const CONFIG_PATH = './config.js'
  const CONFIG_SAMPLE_PATH = './config.sample.js'
  try {
    await fs.access(CONFIG_PATH, fs.constants.R_OK)
  } catch (e) {
    let sampleConfig = await fs.readFile(CONFIG_SAMPLE_PATH)
    await fs.writeFile(CONFIG_PATH, sampleConfig)
    log.info(CONFIG_PATH + ' initialized with sample values')
  }

  // Look for missing config keys
  const config = require(CONFIG_PATH)
  const configSample = require(CONFIG_SAMPLE_PATH)
  for (let key in configSample) {
    if (config[key] === undefined && (key !== 'DB_SQLITE_FILENAME' || config['DB_TYPE'] === 'sqlite3')) {
      log.warn('Key "' + key + '" missing from config.js, using default value "' + configSample[key] + '"')
      config[key] = configSample[key]
    }
  }

  // Create data folders
  const fileStorage = require('./core/file-storage')
  await fileStorage.createFolderIfMissing(path.join(config.DATA_PATH, '/tmp'))
  await fileStorage.createFolderIfMissing(config.UPLOADS_PATH)
}

/*
 * DB initialization
 */
async function initDatabase (withSamples) {
  const db = require('./core/db')
  let currentVersion = await db.findCurrentVersion()
  if (currentVersion > 0) {
    log.info('Database found in version ' + currentVersion + '.')
  } else {
    log.info('Empty database found.')
  }

  await db.upgradeTables(currentVersion)
  if (currentVersion === 0) {
    await db.insertInitialData(withSamples)
  }
  let newVersion = await db.findCurrentVersion()
  if (newVersion > currentVersion) {
    log.info('Database upgraded to version ' + newVersion + '.')
  } else {
    log.info('No database upgrade needed.')
  }
}

/*
 * Use browser-refresh to refresh the browser automatically during development
 */
function configureBrowserRefresh () {
  const config = require('./config.js')

  if (process.send && config.DEBUG_REFRESH_BROWSER) {
    process.send('online')
    browserRefreshClient
      .enableSpecialReload('*.html *.css *.png *.jpeg *.jpg *.gif *.svg',
        { autoRefresh: false })
      .onFileModified(() => browserRefreshClient.refreshPage())
  }
}
