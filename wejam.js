'use strict'

const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const init = require('./lib/init')
const system = require('./lib/system')
const log = require('./lib/log')

system.catchUnhandledPromises()

const app = express()
const isDev = app.get('env') === 'development'

init(isDev).then(function () {
  system.gracefulShutdown(app)

  // Templating
  app.set('views', path.join(__dirname, '/templates'))
  expressNunjucks(app, {
    watch: isDev,
    noCache: isDev
  })

  // Routing
  require('./controllers/entry.js').initRoutes(app)
  require('./controllers/main.js').initRoutes(app)

  // Launch
  const config = require('./config')
  app.listen(config.SERVER_PORT)
  log.info(`Server started on port ${config.SERVER_PORT}.`)
})
