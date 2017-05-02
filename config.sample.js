module.exports = {
  // Web server
  SERVER_PORT: 8000,

  // Database : SQLite
  DB_TYPE: 'sqlite3',
  DB_HOST: 'localhost',
  DB_USER: 'root',
  DB_PASSWORD: '',
  DB_NAME: '',
  DB_SQLITE_FILENAME: 'data/db.sqlite',

  // Database : PostgreSQL
  /* DB_TYPE: 'postgresql',
  DB_HOST: 'localhost',
  DB_USER: 'postgres',
  DB_PASSWORD: '',
  DB_NAME: 'wejam', */

  // Debug options
  DEBUG_SQL: false,
  DEBUG_REFRESH_BROWSER: false
}
