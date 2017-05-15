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
const constants = require('../core/constants')
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
    src: () => path.join(ROOT_PATH, '/static/css/site.css'),
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
  nunjucks.env.addGlobal('constants', constants)
  nunjucks.env.addGlobal('devMode', app.locals.devMode)
  for (var functionName in templating) {
    nunjucks.env.addGlobal(functionName, templating[functionName])
  }
  nunjucks.env.addFilter('markdown', function (str) {
    return markdownConverter.makeHtml(str)
  })
  nunjucks.env.addFilter('date', function (date) {
    if (date) {
      return moment(date).format(constants.DATE_FORMAT)
    } else {
      return ''
    }
  })
  nunjucks.env.addFilter('dateTime', function (date) {
    if (date) {
      return moment(date).format(constants.DATE_TIME_FORMAT)
    } else {
      return ''
    }
  })
  nunjucks.env.addFilter('pickerDateTime', function (date) {
    if (date) {
      return moment(date).format(constants.PICKER_DATE_TIME_FORMAT)
    } else {
      return ''
    }
  })
  nunjucks.env.addFilter('relativeTime', function (date) {
    return moment(date).fromNow()
  })

  // Templating: rendering context
  app.use(function templateTooling (req, res, next) {
    // Allow anyone to display an error page
    res.errorPage = (code, message) => errorPage(req, res, code, message)

    // Context made available anywhere
    let nativeRender = res.render
    res.render = function (template, context) {
      let mergedContext = Object.assign({}, res.locals, context)
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
    res.on('finish', cleanupFormFilesCallback(req, res))
    res.on('close', cleanupFormFilesCallback(req, res))
    next()
  })

  // Routing: Views
  controllers.initRoutes(app)

  // Routing: 500/404
  app.use(function notFound (req, res) {
    errorPage(req, res, 404)
  })
  app.use(function error (err, req, res, next) {
    errorPage(req, res, 500, err)
  })
}

function cleanupFormFilesCallback (req, res) {
  return async function cleanupFormFiles () {
    let {files} = await req.parseForm()
    for (let key in files) {
      fileStorage.remove(files[key].path, false)
    }
    res.removeAllListeners('finish')
    res.removeAllListeners('close')
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
 * code = HTTP error code
 * err = Error object or string message (optional)
 */
function errorPage (req, res, code, err) {
  const message = (err && err.message) || err || ((code === 404) ? 'Page not found' : 'Internal error')
  // Check whether 'development' is on, rather than whether 'production' is
  // off, so we don't leak stack traces in case production is ever
  // misconfigured to leave this undefined.
  const stack = process.env.NODE_ENV == 'development' ? err && err.stack : undefined

  // Internal error logging
  if (code !== 404) {
    if (stack) {
      log.error(message + '\n' + stack)
    } else {
      log.error(message)
    }
  }

  // Page rendering
  let errorTemplate = (code === 404) ? '404' : '500'
  res.status(code)
  res.render(errorTemplate, {
    message,
    stack,
  })
}
