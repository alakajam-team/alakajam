const promisify = require('promisify-node')
const fs = promisify('fs')
const log = require('./log')

module.exports = async function () {
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
    log.info(CONFIG_PATH + ' initialized')
  }

  // DB init
  try {
    let dbSchema = require('./db_schema')
    await dbSchema.dropCreate()
  } catch (e) {
    log.error(e.message)
  }
}
