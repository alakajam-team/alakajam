module.exports = {
  // Web server
  SERVER_PORT: 8000,
  ROOT_URL: 'http://localhost:8000',

  // File storage
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

  // Misc
  // GOOGLE_ANALYTICS_ID: '',

  // Debug options
  DEBUG_INSERT_SAMPLES: true, // Inserts sample data upon DB init (false/true/'nightly')
  DEBUG_SQL: false, // Traces all SQL calls
  DEBUG_REFRESH_BROWSER: true, // Refreshes the browser automatically upon code changes
  DEBUG_ADMIN: false, // Lets you access the "/admin" URL even when logged out
  DEBUG_ENABLE_INVITE_SYSTEM: false // Enables the now abandoned Steam-like key system for creating accounts
}
