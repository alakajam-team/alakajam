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

  // Debug options
  DEBUG_INSERT_SAMPLES: true, // Inserts sample data upon DB init (false/true/'nightly')
  DEBUG_DISABLE_CACHE: true, // Prevents caching pages for performance optimisation
  DEBUG_SQL: false, // Traces all SQL calls
  DEBUG_REFRESH_BROWSER: true, // Refreshes the browser automatically upon code changes
  DEBUG_ADMIN: false, // Lets you access the "/admin" URL even when logged out
  DEBUG_TEST_MAILER: true, // Uses a mailer requiring no config (might not work but emails are logged)
  DEBUG_DISABLE_STARTUP_BUILD: false // Makes the server start faster by not rebuilding the client JS/CSS
}
