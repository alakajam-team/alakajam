let config = require('../config.js')
let knex = require('knex')
let bookshelf = require('bookshelf')

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
let bookshelfInstance = bookshelf(knexInstance)

module.exports = bookshelfInstance
