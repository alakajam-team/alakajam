const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const system = require('./lib/system')

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

app.get('/', function (req, res) {
  res.render('index')
})

// Launch

app.listen(8000)
console.log('Listening on port 8000.')
