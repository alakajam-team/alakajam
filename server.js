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
let startDate = Date.now()
try {
  log = global.log = require('./core/log')
  log.warn('Starting server...')
} catch (e) {
  console.error('Failed to start the server: ' + e.message)
  console.error('Did you run "npm install"?')
  process.exit(1)
}

try {
  let config = require('./config')
  if (config.DEBUG_TRACE_REQUESTS) {
    process.env.DEBUG = 'express:*'
  }
} catch (e) {
  // Nothing (config file might not be created yet)
}

/**
 * Initial dependencies
 */

const promisify = require('promisify-node')
const fs = promisify('fs')
const path = require('path')
const postcssWatch = require('postcss-watch')
const webpack = require('webpack')
const mkdirp = promisify('mkdirp')
const express = require('express')

/**
 * Local constants
 */

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development'
}
const DEV_ENVIRONMENT = process.env.NODE_ENV === 'development'
const CSS_INDEX_SRC_FOLDER = path.join(__dirname, './assets/css/')
const CSS_INDEX_DEST_FOLDER = path.join(__dirname, './static/css/')
const CSS_PLUGINS = [
  require('postcss-import'),
  require('postcss-cssnext')
]

/**
 * App launch!
 */

createApp()

/*
 * Create, configure and launch the server
 */
async function createApp () {
  catchErrorsAndSignals()
  await initFilesLayout()

  const middleware = require('./core/middleware')
  const db = require('./core/db')
  const config = require('./config')

  let app = express()
  app.disable('x-powered-by')

  app.locals.devMode = DEV_ENVIRONMENT
  await db.initDatabase(app.locals.devMode && config.DEBUG_INSERT_SAMPLES)
  await middleware.configure(app)

  app.listen(config.SERVER_PORT, function () {
    let startSeconds = (Date.now() - startDate) / 1000
    log.warn('Server started in ' + startSeconds.toFixed(1) + 's on port ' + config.SERVER_PORT + '.')
    if (process.send) {
      process.send('online') // browser-refresh event
    }
  })
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
    log.error('Unhandled promise rejection:', reason, p)
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
  let configPath = path.join(__dirname, './config.js')
  let configSamplePath = path.join(__dirname, './config.sample.js')
  try {
    await fs.access(configPath, fs.constants.R_OK)
  } catch (e) {
    let sampleConfig = await fs.readFile(configSamplePath)
    await fs.writeFile(configPath, sampleConfig)
    log.info(configPath + ' initialized with sample values')
  }

  // Look for missing config keys
  const config = require(configPath)
  const configSample = require(configSamplePath)
  for (let key in configSample) {
    if (config[key] === undefined && (key !== 'DB_SQLITE_FILENAME' || config['DB_TYPE'] === 'sqlite3')) {
      log.warn('Key "' + key + '" missing from config.js, using default value "' + configSample[key] + '"')
      config[key] = configSample[key]
    }
  }

  // Create data folders
  await _createFolderIfMissing(path.join(__dirname, config.DATA_PATH, '/tmp'))
  await _createFolderIfMissing(path.join(__dirname, config.UPLOADS_PATH))

  // Configure browser-refresh
  try {
    configureBrowserRefresh()
  } catch (e) {
    // Nothing (dev-only dependency)
  }

  // Run CSS and JS build (or bootstrap sources watcher in dev mode)
  if (!config.DEBUG_DISABLE_STARTUP_BUILD) {
    await buildCSS(DEV_ENVIRONMENT)
    await buildJS(DEV_ENVIRONMENT)
  }
}

/*
 * Use browser-refresh to refresh the browser automatically during development
 */
function configureBrowserRefresh () {
  const config = require('./config')
  const browserRefreshClient = require('browser-refresh-client')

  const CLIENT_RESOURCES = '/templates/** /static/**'

  // Configure for client-side resources
  if (config.DEBUG_REFRESH_BROWSER) {
    browserRefreshClient
      .enableSpecialReload(CLIENT_RESOURCES)
      .onFileModified(async function (path) {
        if (path.endsWith('.css')) {
          browserRefreshClient.refreshStyles()
        } else if (path.endsWith('.gif') || path.endsWith('.jpg') || path.endsWith('.png')) {
          browserRefreshClient.refreshImages()
        } else {
          browserRefreshClient.refreshPage()
        }
      })
  } else {
    browserRefreshClient
      .enableSpecialReload(CLIENT_RESOURCES, { autoRefresh: false })
  }
}

async function buildCSS (watch = false) {
  await _createFolderIfMissing(path.join(__dirname, CSS_INDEX_DEST_FOLDER))
  if (watch) {
    log.info('Setting up automatic CSS build...')
  } else {
    log.info('Building CSS...')
  }

  postcssWatch({
    input: _postcssWatchPathFix(CSS_INDEX_SRC_FOLDER),
    output: _postcssWatchPathFix(CSS_INDEX_DEST_FOLDER),
    plugins: CSS_PLUGINS,
    copyAssets: ['png'],
    log: DEV_ENVIRONMENT,
    watch
  })
}

async function buildJS (watch = false) {
  const env = process.env.NODE_ENV || 'development'
  const config = require('./webpack.' + env)

  await _createFolderIfMissing(path.join(__dirname, config.output.path))

  const compiler = webpack(config)

  await new Promise(function (resolve, reject) {
    function callback (err, stats) {
      // https://webpack.js.org/api/node/#error-handling

      if (err) {
        // This means an error in webpack or its configuration, not an error in
        // the compiled sources.
        log.error(err.stack || err)
        if (err.details) {
          log.error(err.details)
        }
        return
      }

      let logMethod = log.info.bind(log)
      if (stats.hasErrors()) {
        logMethod = log.error.bind(log)
      } else if (stats.hasWarnings()) {
        logMethod = log.warn.bind(log)
      }
      logMethod(stats.toString(config.stats))

      resolve()
    }

    if (watch) {
      log.info('Setting up automatic JS build...')
      compiler.watch(config.watchOptions || {}, callback)
    } else {
      log.info('Building JS...')
      compiler.run(callback)
    }
  })
}

/**
 * A postcss-watch bug converts input paths to output paths incorrectly depending on the folder syntax
 */
function _postcssWatchPathFix (anyPath) {
  return path.relative(process.cwd(), anyPath).replace(/\\/g, '/')
}

/**
 * Creates a folder. No-op if the folder exists.
 */
async function _createFolderIfMissing (folderPath) {
  try {
    await fs.access(folderPath, fs.constants.R_OK)
  } catch (e) {
    await mkdirp(folderPath)
  }
}
