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
const moment = require('moment')
const randomKey = require('random-key')
const log = require('./log')
const config = require('../config')
const constants = require('../core/constants')
const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
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
  app.locals.config = config

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
  nunjucks.env.addGlobal('browserRefreshUrl', process.env.BROWSER_REFRESH_URL)
  nunjucks.env.addGlobal('constants', constants)
  nunjucks.env.addGlobal('devMode', app.locals.devMode)
  nunjucks.env.addGlobal('context', function () {
    // lets devs display the whole templating context with
    // {{ context() | prettyDump | safe }}
    return this.ctx
  })
  for (var functionName in templating) {
    nunjucks.env.addGlobal(functionName, templating[functionName])
  }

  nunjucks.env.addFilter('prettyDump', function (obj) {
    return '<pre>' + JSON.stringify(obj, null, 2) + '</pre>'
  })
  nunjucks.env.addFilter('markdown', function (str) {
    return forms.markdownToHtml(str)
  })
  nunjucks.env.addFilter('markdownUnescape', function (str) {
    return str ? str.replace(/&amp;/g, '&') : null
  })
  nunjucks.env.addFilter('date', function (date) {
    if (date) {
      return moment(date).utc().format(constants.DATE_FORMAT)
    } else {
      return ''
    }
  })
  nunjucks.env.addFilter('dateTime', function (date) {
    if (date) {
      return moment(date).utc().format(constants.DATE_TIME_FORMAT) + ' UTC'
    } else {
      return ''
    }
  })
  nunjucks.env.addFilter('featuredEventDateTime', function (date) {
    if (date) {
      return moment(date).utc().format(constants.FEATURED_EVENT_DATE_FORMAT)
    } else {
      return ''
    }
  })
  nunjucks.env.addFilter('pickerDateTime', function (date) {
    if (date) {
      return moment(date).utc().format(constants.PICKER_DATE_TIME_FORMAT)
    } else {
      return ''
    }
  })
  nunjucks.env.addFilter('relativeTime', function (date) {
    return moment(date).utc().fromNow()
  })
  nunjucks.env.addFilter('ordinal', function (n) {
    // source: https://stackoverflow.com/a/12487454
    let s = ['th', 'st', 'nd', 'rd']
    let v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  })

  // Templating: rendering context
  app.use(function templateTooling (req, res, next) {
    // Allow anyone to display an error page
    res.errorPage = (code, message) => errorPage(req, res, code, message, app.locals.devMode)

    // Context made available anywhere
    let nativeRender = res.render
    res.render = function (template, context) {
      let mergedContext = Object.assign({
        rootUrl: config.ROOT_URL
      }, res.locals, context)
      nativeRender.call(res, template, mergedContext)
      res.rendered = true
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
      return parseRequest(req, res)
    }
    res.on('finish', cleanupFormFilesCallback(req, res))
    res.on('close', cleanupFormFilesCallback(req, res))
    next()
  })

  // Routing: Views
  controllers.initRoutes(app)

  // Routing: 500/404
  app.use(function notFound (req, res) {
    errorPage(req, res, 404, undefined, app.locals.devMode)
  })
  app.use(function error (error, req, res, next) {
    errorPage(req, res, 500, error, app.locals.devMode)
  })
}

function cleanupFormFilesCallback (req, res) {
  return async function cleanupFormFiles () {
    let {files} = await req.parseForm()
    for (let key in files) {
      fileStorage.remove(files[key].path)
    }
    res.removeAllListeners('finish')
    res.removeAllListeners('close')
  }
}

async function findOrCreateSessionKey () {
  let sessionKey = await settingService.find(constants.SETTING_SESSION_KEY)
  if (!sessionKey) {
    sessionKey = randomKey.generate()
    await settingService.save(constants.SETTING_SESSION_KEY, sessionKey)
  }
  return sessionKey
}

/*
 * Middleware displaying an error page
 * code = HTTP error code
 * error = Error object or string message (optional)
 */
function errorPage (req, res, code, error, devMode) {
  const stack = devMode ? error && error.stack : undefined
  let message = (typeof error === 'object') ? error.message : error
  let title
  switch (code) {
    case 404:
      title = 'Page not found'
      break
    case 403:
      title = 'Forbidden'
      break
    case 500:
      title = 'Internal error'
      break
    default:
      title = 'Error'
  }

  // Internal error logging
  if (code !== 404 && code !== 403) {
    log.error(message + (error ? '\n' + error.stack : ''))
  }

  // Page rendering
  res.status(code)
  res.render('error', {
    code,
    title,
    message,
    stack
  })
}
