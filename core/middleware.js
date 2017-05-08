'use strict'

/**
 * Server middleware configuration.
 *
 * @description Sets up:
 * - CSS processing (cssnext)
 * - Templating (nunjucks)
 * - Form parsing / file upload (formidable)
 * - Error pages
 *
 * @module core/middleware
 */

const path = require('path')
const express = require('express')
const expressNunjucks = require('express-nunjucks')
const cookies = require('cookies')
const postCss = require('postcss-middleware')
const formidable = require('formidable')
const promisify = require('promisify-node')
const showdown = require('showdown')
const moment = require('moment')
const randomKey = require('random-key')
const log = require('./log')
const config = require('../config')
const fileStorage = require('../core/file-storage')
const settingService = require('../services/setting-service')
const sessionService = require('../services/session-service')
const controllers = require('../controllers/index')
const templating = require('../controllers/templating')

module.exports = {
  configure
}

const ROOT_PATH = path.join(__dirname, '..')
const MB = 1024 * 1024

/*
 * Setup app middleware
 */
async function configure (app) {
  // Session management
  app.locals.sessionCache = await sessionService.loadSessionCache()
  let sessionKey = await findOrCreateSessionKey()
  app.use(cookies.express([sessionKey]))

  // Routing: static files (including NextCSS filter)
  app.use('/static/css/site.css', postCss({
    src: (req) => path.join(ROOT_PATH, '/static/css/site.css', req.path),
    plugins: [require('postcss-cssnext')]
  }))
  app.use('/static', express.static(path.join(ROOT_PATH, '/static')))

  // Templating
  app.set('views', path.join(ROOT_PATH, '/templates'))
  let nunjucks = expressNunjucks(app, {
    watch: app.locals.devMode,
    noCache: app.locals.devMode
  })

  // Templating: custom filters
  let markdownConverter = new showdown.Converter()
  nunjucks.env.addGlobal('browserRefreshUrl', process.env.BROWSER_REFRESH_URL)
  for (var functionName in templating) {
     nunjucks.env.addGlobal(functionName, templating[functionName])
  }
  nunjucks.env.addFilter('markdown', function (str) {
    return markdownConverter.makeHtml(str)
  })
  nunjucks.env.addFilter('date', function (date) {
    return moment(date).fromNow()
  })

  // Templating: rendering context
  app.use(function (req, res, next) {
    // Allow anyone to display an error page
    res.errorPage = (code, message) => errorPage(req, res, code, message)

    // Context made available anywhere
    let nativeRender = res.render
    res.render = function (template, context) {
      let mergedContext = Object.assign({}, context, res.locals)
      nativeRender.call(res, template, mergedContext)
    }

    next()
  })

  // Formidable (form parsing/file upload)
  let form = new formidable.IncomingForm()
  form.uploadDir = path.join(__dirname, '..', config.DATA_PATH, 'tmp')
  form.maxFieldsSize = 2 * MB
  form.keepExtensions = true
  let parseRequest = promisify(function (req, res, callback) {
    if (!res.locals.form) {
      form.parse(req, function (error, fields, files) {
        res.locals.form = {fields, files}
        callback(error, res.locals.form)
      })
    } else {
      callback(null, res.locals.form)
    }
  })
  app.use(function (req, res, next) {
    // usage: let {fields, files} = await req.parseForm()
    req.parseForm = async function () {
      return await parseRequest(req, res)
    }
  /*  res.on('finish', cleanupFormFilesCallback(req, res));
    res.on('close', cleanupFormFilesCallback(req, res));*/
    next()
  })

  // Routing: Views
  controllers.initRoutes(app)

  // Routing: 500/404
  app.use(function (err, req, res, next) {
    if (err) {
      errorPage(req, res, 500, err.message)
    } else {
      errorPage(req, res, 404)
    }
  })
}

function cleanupFormFilesCallback(req, res) {
  return async function cleanupFormFiles () {
    let {files} = await req.parseForm()
    for (let key in files) {
  //    fileStorage.remove(files[key].path, false)
    }
    res.removeAllListeners('finish');
    res.removeAllListeners('close');
  }
}

async function findOrCreateSessionKey () {
  let sessionKey = await settingService.find('session_key')
  if (!sessionKey) {
    sessionKey = randomKey.generate()
    await settingService.save('session_key')
  }
  return sessionKey
}

/*
 * Middleware displaying an error page
 * code = Error code
 * message = Error message (optional)
 */
function errorPage (req, res, code, message) {
  let errorTemplate = (code === 404) ? '404' : '500'
  let defaultMessage = (code === 404) ? 'Page not found' : ''

  // Internal error logging
  if (code !== 404) {
    if (message instanceof Error) {
      log.error(message.message + '\n' + message.stack)
    } else {
      log.error(message || defaultMessage)
    }
  }

  // Page rendering
  if (message instanceof Error) {
    message = message.message
  }
  res.status(code)
  res.render(errorTemplate, {message: message || defaultMessage})
}
