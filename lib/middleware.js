const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const postCss = require('postcss-middleware')
const config = require('../config')

const ROOT_PATH = path.join(__dirname, '..')

/**
 * Setup app middleware
 */
module.exports.configure = async function (app) {
  // Views routing
  require('../controllers/entry.js').initRoutes(app)
  require('../controllers/main.js').initRoutes(app)

  // Templating
  app.set('views', path.join(ROOT_PATH, '/templates'))
  expressNunjucks(app, {
    watch: app.locals.devMode,
    noCache: app.locals.devMode
  })
  app.locals.appTitle = config.APP_TITLE

  // Static files (including NextCSS filter)
  app.use('/static/css', postCss({
    src: (req) => path.join(ROOT_PATH, '/static/css', req.path),
    plugins: [require('postcss-cssnext')]
  }))
  app.use('/static', express.static(path.join(ROOT_PATH, '/static')))

  // 404
  app.use(function (req, res) {
    res.status(404)
    res.end('404')
  })
}

