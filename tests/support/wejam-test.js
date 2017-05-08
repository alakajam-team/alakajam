'use strict'

/**
 * Override the config file to make tests run separately
 */

const promisify = require('promisify-node')
const fs = promisify('fs')
const rimraf = promisify('rimraf')
const path = require('path')
const log = global.log = require('../../core/log')

module.exports = async function weJamInit () {
  await createConfigFileIfMissing()
  overrideConfig()
  await initFilesLayout()
  await initDatabase()
}

function overrideConfig () {
  const config = require('../../config')

  let testConfig = {
    // Web server
    SERVER_PORT: 8001,

    // Data storage
    DATA_PATH: 'tests/data/',
    UPLOADS_PATH: 'tests/data/uploads/',

    // Database : SQLite
    DB_TYPE: 'sqlite3',
    DB_HOST: 'localhost',
    DB_USER: 'root',
    DB_PASSWORD: '',
    DB_NAME: '',
    DB_SQLITE_FILENAME: 'tests/data/db.sqlite',
    
    // Debug options
    DEBUG_SQL: false,
    DEBUG_REFRESH_BROWSER: false,
    DEBUG_ADMIN: false
  }

  // Override config
  for (var key in testConfig) {
    config[key] = testConfig[key]
  }
}

async function createConfigFileIfMissing () {
  const CONFIG_PATH = '../../config.js'
  const CONFIG_SAMPLE_PATH = './config.sample.js'
  try {
    await fs.access(CONFIG_PATH, fs.constants.R_OK)
  } catch (e) {
    let sampleConfig = await fs.readFile(CONFIG_SAMPLE_PATH)
    await fs.writeFile(CONFIG_PATH, sampleConfig)
  }
}

async function initFilesLayout () {
  const config = require('../../config')
  const fileStorage = require('../../core/file-storage')

  // Delete/recreate folders
  await rimraf(config.DATA_PATH)
  await rimraf(config.UPLOADS_PATH)
  await fileStorage.createFolderIfMissing(path.join(config.DATA_PATH, '/tmp'))
  await fileStorage.createFolderIfMissing(config.UPLOADS_PATH)
}

async function initDatabase () {
  const db = require('../../core/db')
  await db.upgradeTables(true)
}

async function unlinkIfExists (path) {

}