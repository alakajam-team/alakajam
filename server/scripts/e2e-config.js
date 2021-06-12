module.exports = {
  SERVER_PORT: 8001,
  ROOT_URL: 'http://localhost:8001',
  STATIC_ROOT_URL: false,
  SECURE_SESSION_COOKIES: false,
  
  DATA_PATH: 'cypress/',

  DB_TYPE: 'sqlite3',
  DB_HOST: 'localhost',
  DB_USER: 'root',
  DB_PASSWORD: '',
  DB_NAME: '',
  DB_SQLITE_FILENAME: 'cypress/e2e.sqlite',

  DEBUG_DISABLE_STARTUP_BUILD: true,
  DEBUG_INSERT_SAMPLES: false,
  DEBUG_DISABLE_CACHE: true, 
  DEBUG_REFRESH_BROWSER: true, 
  DEBUG_ADMIN: true, 
  DEBUG_TEST_MAILER: true, 
  DEBUG_ARTICLES: true, 
  DEBUG_LONG_PROMISE_TRACES: false, 
  DEBUG_DISABLE_SLOW_DOWN: true, 
  DEBUG_DISABLE_CAPTCHA: true,
  
  LOG_LEVEL: 'debug', 
  DEBUG_TRACE_SQL: false, 
  DEBUG_TRACE_SLOW_SQL: -1, 
  DEBUG_TRACE_REQUESTS: false, 
  DEBUG_TRACE_SLOW_REQUESTS: -1, 
}
