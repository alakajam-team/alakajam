'use strict'

const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const postCss = require('postcss-middleware')
const formidable = require('formidable')
const promisify = require('promisify-node')

const ROOT_PATH = path.join(__dirname, '..')
const MB = 1024 * 1024

/**
 * Setup app middleware
 */
module.exports.configure = async function (app) {
  // Routing: static files (including NextCSS filter)
  app.use('/static/css/site.css', postCss({
    src: (req) => path.join(ROOT_PATH, '/static/css/site.css', req.path),
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
    res.errorPage = (code, message) => errorPage(req, res, code, message)

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

  // Formidable (form parsing/file upload)
  let form = new formidable.IncomingForm()
  form.uploadDir = path.join(__dirname, '../data/tmp')
  form.maxFieldsSize = 2 * MB
  form.keepExtensions = true
  let parseRequest = promisify(function (req, callback) {
    form.parse(req, function (error, fields, files) {
      callback(error, {fields, files})
    })
  })
  app.use(function (req, res, next) {
    // usage: let [fields, files] = await req.parseForm()
    req.parseForm = async function () {
      let result = await parseRequest(req)
      return [result.fields, result.files]
    }
    next()
  })

  // Routing: Views
  require('../controllers/event.js').initRoutes(app)
  require('../controllers/entry.js').initRoutes(app)
  require('../controllers/main.js').initRoutes(app)

  // Routing: 404
  app.use((req, res) => errorPage(req, res, 404))
}

/**
 * Middleware displaying an error page
 */
function errorPage (req, res, code, message) {
  let errorTemplate = (code === 500) ? '500' : '404'
  let defaultMessage = (code === 404) ? 'Page not found' : ''
  res.status(code)
  res.render(errorTemplate, {message: message || defaultMessage})
}
