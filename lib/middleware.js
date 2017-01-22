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
  // Templating
  app.set('views', path.join(ROOT_PATH, '/templates'))
  let njk = expressNunjucks(app, {
    watch: app.locals.devMode,
    noCache: app.locals.devMode
  })
  // FIXME Breaks bookshelf getters
  /*app.use(njk.ctxProc([function (req, context) {
    console.log(context)
    // Context variables made available in all templates
    context.path = req.url.slice(1)
  }]))*/
  
  // Routing: static files (including NextCSS filter)
  app.use('/static/css', postCss({
    src: (req) => path.join(ROOT_PATH, '/static/css', req.path),
    plugins: [require('postcss-cssnext')]
  }))
  app.use('/static', express.static(path.join(ROOT_PATH, '/static')))
  
  // Routing: Views
  require('../controllers/event.js').initRoutes(app)
  require('../controllers/entry.js').initRoutes(app)
  require('../controllers/main.js').initRoutes(app)

  // Routing: 404
  app.use(function (req, res) {
    res.status(404)
    res.render('404', {errorMessage: res.locals.errorMessage || 'Page not found'})
  })
}

