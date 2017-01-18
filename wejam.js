'use strict'

const promisify = require('promisify-node')
const fs = promisify('fs')
const express = require('express')
const log = require('./lib/log')

createApp()

/**
 * Create, configure and launch the server
 */
async function createApp () {
  catchErrorsAndSignals()
  await initFilesLayout()
  
  const middleware = require('./lib/middleware')
  const config = require('./config')
  
  const app = express()
  app.locals.devMode = app.get('env') === 'development'
  await initDatabase(app.locals.devMode)
  await middleware.configure(app)
  app.listen(config.SERVER_PORT)
  log.info(`Server started on port ${config.SERVER_PORT}.`)
}

/**
 * Catch unhandled errors and system signals
 */
function catchErrorsAndSignals () {
  // Display unhandled rejections more nicely
  process.on('unhandledException', (e) => {
    log.error('Unhandled promise rejection:', e)
    _doGracefulShutdown(() => process.exit(-1))
  })
  process.on('unhandledRejection', (reason, p) => {
    log.error('Unhandled promise rejection:', p)
  })

  // Stop the server gracefully upon shut down signals
  let signals = ['SIGINT', 'SIGQUIT', 'SIGTERM']
  signals.forEach((signal) => {
    process.on(signal, () => _doGracefulShutdown())
  })

  function _doGracefulShutdown (cb) {
    const db = require('./lib/db')
    log.info('Shutting down.')
    db.knex.destroy(cb)
  }
}

/**
 * Initialize files for first startup
 */
async function initFilesLayout () {
  // Create data folder
  const DATA_PATH = './data'
  try {
    await fs.access(DATA_PATH, fs.constants.R_OK)
  } catch (e) {
    await fs.mkdir(DATA_PATH)
  }

  // Create config.js if missing
  const CONFIG_PATH = './config.js'
  const CONFIG_SAMPLE_PATH = './config.sample.js'
  try {
    await fs.access(CONFIG_PATH, fs.constants.R_OK)
  } catch (e) {
    let sampleConfig = await fs.readFile(CONFIG_SAMPLE_PATH)
    await fs.appendFile(CONFIG_PATH, sampleConfig)
    log.info(CONFIG_PATH + ' initialized with sample values')
  }
}

/**
 * DB initialization.
 * XXX Currently the whole DB is recreated on each startup
 */
async function initDatabase (withSamples) {
  try {
    const db = require('./lib/db')
    await db.dropCreateTables()
    if (withSamples) {
      await db.insertSamples()
    }
  } catch (e) {
    log.error(e.stack)
  }
}
