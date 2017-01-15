const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const init = require('./lib/init')
const system = require('./lib/system')
const log = require('./lib/log')

init().then(function () {
  // App setup

  const app = express()
  const isDev = app.get('env') === 'development'

  system.gracefulShutdown(app)

  app.set('views', path.join(__dirname, '/templates'))

  expressNunjucks(app, {
    watch: isDev,
    noCache: isDev
  })

  // App routing

  require('./controllers/index.js').initRoutes(app)

  // Launch

  const config = require('./config')
  app.listen(config.SERVER_PORT)
  log.info(`Server started on port ${config.SERVER_PORT}.`)
})
