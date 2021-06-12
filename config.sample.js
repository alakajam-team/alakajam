module.exports = {
  // Web server
  SERVER_PORT: 8000,
  ROOT_URL: 'http://localhost:8000',
  STATIC_ROOT_URL: false,
  SECURE_SESSION_COOKIES: false,
  READ_ONLY_MODE: false,

  // File storage
  DATA_PATH: 'data/',

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

  // Integrations
  /* SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 465,
  SMTP_USERNAME: 'webmaster@example.com',
  SMTP_PASSWORD: '', 
  TWITCH_CLIENT_ID: '',
  TWITCH_CLIENT_SECRET: '',
  */

  // Debug: general options
  DEBUG_DISABLE_STARTUP_BUILD: false, // Makes the server start faster by not building the client JS/CSS (you will have to "npm run build" by hand)
  DEBUG_INSERT_SAMPLES: true, // Inserts sample data upon DB init (false/true/'nightly')
  DEBUG_DISABLE_CACHE: true, // Prevents caching pages for performance optimisation
  DEBUG_REFRESH_BROWSER: true, // Refreshes the browser automatically upon code changes
  DEBUG_ADMIN: false, // Lets you access the admin back-end even when logged out
  DEBUG_TEST_MAILER: true, // Uses the fake https://ethereal.email/ mailer (emails are also logged in console)
  DEBUG_ARTICLES: true, // Uses the local version of the articles rather than downloading them from Github
  DEBUG_LONG_PROMISE_TRACES: false, // Enables better stack traces for Promises, at a performance and stability (Knex support) cost
  DEBUG_DISABLE_SLOW_DOWN: false, // Disables mechanisms to slow down spammers, mostly useful for E2E and load testing
  DEBUG_DISABLE_CAPTCHA: false, // Disable human verification tests

  // Debug: trace options
  LOG_LEVEL: 'debug', // Verbose level among 'none', 'error', 'warn', 'info', 'debug'
  DEBUG_TRACE_SQL: false, // Traces all SQL calls
  DEBUG_TRACE_SLOW_SQL: -1, // Traces SQL calls taking more than the specified time (in milliseconds, use -1 to disable)
  DEBUG_TRACE_REQUESTS: false, // Enables route debug mode to trace request routes & timing
  DEBUG_TRACE_SLOW_REQUESTS: -1, // Traces HTTP requests calls taking more than the specified time (in milliseconds, use -1 to disable)
  
  // Captcha
  CAPTCHA_GROUP_LARGE: [
    { label: 'castle', icon: 'fab fa-fort-awesome' }
  ],
  CAPTCHA_GROUP_SMALL: [
    { label: 'flower', icon: 'fab fa-fort-awesome' }
  ]
}
