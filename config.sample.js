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

  // Emails
  /* SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 465,
  SMTP_USERNAME: 'webmaster@example.com',
  SMTP_PASSWORD: '', */

  // Misc
  // GOOGLE_ANALYTICS_ID: '',

  // Debug: general options
  DEBUG_INSERT_SAMPLES: true, // Inserts sample data upon DB init (false/true/'nightly')
  DEBUG_DISABLE_CACHE: true, // Prevents caching pages for performance optimisation
  DEBUG_REFRESH_BROWSER: true, // Refreshes the browser automatically upon code changes
  DEBUG_ADMIN: false, // Lets you access the admin back-end even when logged out
  DEBUG_TEST_MAILER: true, // Uses a mailer requiring no config (might not work but emails are logged)
  DEBUG_DISABLE_STARTUP_BUILD: false, // Makes the server start faster by not rebuilding the client JS/CSS

  // Debug: trace options
  LOG_LEVEL: 'debug', // Verbose level among 'none', 'error', 'warning', 'info', 'debug'
  DEBUG_TRACE_SQL: false, // Traces all SQL calls
  DEBUG_TRACE_SLOW_SQL: -1, // Traces SQL calls taking more than the specified time (in milliseconds, use -1 to disable)
  DEBUG_TRACE_REQUESTS: false, // Enables Express debug mode to trace request routes & timing
  DEBUG_TRACE_SLOW_REQUESTS: -1 // Traces HTTP requests calls taking more than the specified time (in milliseconds, use -1 to disable)
}
