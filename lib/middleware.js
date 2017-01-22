const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const postCss = require('postcss-middleware')

const ROOT_PATH = path.join(__dirname, '..')

/**
 * Setup app middleware
 */
module.exports.configure = async function (app) {
  // Routing: static files (including NextCSS filter)
  app.use('/static/css/wejam.css', postCss({
    src: (req) => path.join(ROOT_PATH, '/static/css/wejam.css', req.path),
    plugins: [require('postcss-cssnext')]
  }))
  app.use('/static', express.static(path.join(ROOT_PATH, '/static')))

  // Templating
  app.set('views', path.join(ROOT_PATH, '/templates'))
  expressNunjucks(app, {
    watch: app.locals.devMode,
    noCache: app.locals.devMode
  })
  app.use(function (req, res, next) {
    // Allow anyone to display a 404
    res.error404 = () => error404(req, res)

    // Context made available anywhere
    let superRender = res.render
    res.render = function (template, context) {
      context = context || {}
      // TODO Also copy all locals to the context
      context.path = req.url
      superRender.call(res, template, context)
    }
    // XXX Somehow breaks Bookshelf getters
    // app.use(expressNunjucksInstance.ctxProc([function (req, context) {
    //    context.path = req.url
    // }]))

    next()
  })

  // Routing: Views
  require('../controllers/event.js').initRoutes(app)
  require('../controllers/entry.js').initRoutes(app)
  require('../controllers/main.js').initRoutes(app)

  // Routing: 404
  app.use(error404)
}

/**
 * Middleware displaying a 404 page
 */
function error404 (req, res) {
  console.log('404!!!!')
  res.status(404)
  res.render('404', {errorMessage: res.locals.errorMessage || 'Page not found'})
}
