module.exports = {
  // Web server
  SERVER_PORT: 8000,

  // Data storage
  DATA_PATH: 'data/',
  UPLOADS_PATH: 'static/uploads/',

  // Database: SQLite
  DB_TYPE: 'sqlite3',
  DB_HOST: 'localhost',
  DB_USER: 'root',
  DB_PASSWORD: '',
  DB_NAME: '',
  DB_SQLITE_FILENAME: 'data/db.sqlite',

  // Database: PostgreSQL
  /* DB_TYPE: 'postgresql',
  DB_HOST: 'localhost',
  DB_USER: 'postgres',
  DB_PASSWORD: '',
  DB_NAME: 'alakajam', */

  // Debug options
  DEBUG_INSERT_SAMPLES: true, // Inserts sample data upon DB init
  DEBUG_SQL: false, // Traces all SQL calls
  DEBUG_REFRESH_BROWSER: true, // Refreshes the browser automatically upon code changes
  DEBUG_ADMIN: false, // Lets you access the "/admin" URL even when logged out
  DEBUG_ALLOW_INVALID_INVITE_KEYS: false // Lets you register without an invite key
}
