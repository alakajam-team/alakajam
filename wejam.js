const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const system = require('./lib/system')
const dbSchema = require('./lib/db_schema')

dbSchema.dropCreate().then(function() {

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

  app.listen(8000)
  console.log('Listening on port 8000.')
  
})
