'use strict'

/**
 * Server middleware configuration.
 *
 * @description Sets up:
 * - CSS processing (cssnext)
 * - JS processing (browserify)
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
const browserifyMiddleware = require('browserify-middleware')
const multer = require('multer')
const bodyParser = require('body-parser')
const promisify = require('promisify-node')
const moment = require('moment')
const nunjucks = require('nunjucks')
const randomKey = require('random-key')
const log = require('./log')
const config = require('../config')
const constants = require('../core/constants')
const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
const settingService = require('../services/setting-service')
const sessionService = require('../services/session-service')
const userService = require('../services/user-service')
const controllers = require('../controllers/index')
const templating = require('../controllers/templating')

module.exports = {
  configure
}

const ROOT_PATH = path.join(__dirname, '..')
const MB = 1024 * 1024
const LAUNCH_TIME = new Date().getTime()

/*
 * Setup app middleware
 */
async function configure (app) {
  app.locals.config = config

  // In-memory data
  await userService.loadPasswordRecoveryCache(app)
  await sessionService.loadSessionCache(app)

  // Session management
  let sessionKey = await findOrCreateSessionKey()
  app.use(cookies.express([sessionKey]))

  // CSS files
  app.use('/static/css/site.css', postCss({
    src: () => path.join(ROOT_PATH, '/static/css/site.css'),
    plugins: [require('postcss-cssnext')]
  }))

  // JavaScript files
  app.use('/static/js/site.js', bundleJs(app.locals.devMode))

  // Remaining static files
  app.use('/static', express.static(path.join(ROOT_PATH, '/static')))

  // Templating
  app.set('views', path.join(ROOT_PATH, '/templates'))
  let nj = expressNunjucks(app, {
    watch: app.locals.devMode,
    noCache: app.locals.devMode
  })

  // Templating: custom filters
  nj.env.addGlobal('browserRefreshUrl', process.env.BROWSER_REFRESH_URL)
  nj.env.addGlobal('constants', constants)
  nj.env.addGlobal('devMode', app.locals.devMode)
  nj.env.addGlobal('launchTime', LAUNCH_TIME)
  nj.env.addGlobal('context', function () {
    // lets devs display the whole templating context with
    // {{ context() | prettyDump | safe }}
    this.ctx.constants = constants
    this.ctx.devMode = app.locals.devMode
    return this.ctx
  })
  for (var functionName in templating) {
    nj.env.addGlobal(functionName, templating[functionName])
  }

  nj.env.addFilter('prettyDump', function (obj) {
    return '<pre>' + JSON.stringify(obj, null, 2) + '</pre>'
  })
  nj.env.addFilter('markdown', function (str) {
    return forms.markdownToHtml(str)
  })
  nj.env.addFilter('markdownUnescape', function (str) {
    return str ? str.replace(/&amp;/g, '&').replace(/&quot;/g, '"') : null
  })
  nj.env.addFilter('date', function (date) {
    if (date) {
      return moment(date).utc().format(constants.DATE_FORMAT)
    } else {
      return ''
    }
  })
  nj.env.addFilter('dateTime', function (date) {
    if (date) {
      return moment(date).utc().format(constants.DATE_TIME_FORMAT)
    } else {
      return ''
    }
  })
  nj.env.addFilter('featuredEventDateTime', function (date) {
    if (date) {
      return moment(date).utc().format(constants.FEATURED_EVENT_DATE_FORMAT) +
        ' <a href="https://www.timeanddate.com/worldclock/timezone/utc">UTC</a>'
    } else {
      return ''
    }
  })
  nj.env.addFilter('pickerDateTime', function (date) {
    if (date) {
      return moment(date).utc().format(constants.PICKER_DATE_TIME_FORMAT)
    } else {
      return ''
    }
  })
  nj.env.addFilter('relativeTime', function (date) {
    return moment(date).utc().fromNow()
  })
  nj.env.addFilter('ordinal', function (n) {
    // source: https://stackoverflow.com/a/12487454
    let s = ['th', 'st', 'nd', 'rd']
    let v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  })
  nj.env.addFilter('digits', function (number, digits) {
    if (typeof number === 'string') {
      number = parseFloat(number)
    }
    if (typeof number === 'number') {
      return number.toFixed(digits)
    } else {
      return null
    }
  })
  nj.env.addFilter('paginationBasePath', function (path) {
    let basePath = path.replace(/[?&]p=[^&]*/g, '')
    if (!basePath.includes('?')) {
      basePath += '?'
    }
    return basePath
  })
  /**
   * Returns a JSON stringified version of the value, safe for inclusion in an
   * inline <script> tag. The optional argument 'spaces' can be used for
   * pretty-printing.
   *
   * Output is NOT safe for inclusion in HTML! If that's what you need, use the
   * built-in 'dump' filter instead.
   */
  nj.env.addFilter('jsonInsideScriptTag', function (value, spaces) {
    if (value instanceof nunjucks.runtime.SafeString) {
      value = value.toString()
    }
    const jsonString = JSON.stringify(value, null, spaces).replace(/</g, '\\u003c')
    return nunjucks.runtime.markSafe(jsonString)
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

  // Multer (form parsing/file upload)
  app.use(bodyParser.urlencoded({ extended: false }))
  let uploadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '..', config.DATA_PATH, 'tmp'))
    },
    filename: function (req, file, cb) {
      file.filename = randomKey.generate() + '-' + file.originalname
      cb(null, file.filename)
    }
  })
  let upload = multer({
    storage: uploadStorage,
    limits: {
      fields: 1000,
      fileSize: 2 * MB,
      files: 20,
      parts: 20
    }
  })
  let doParseForm = promisify(function (req, res, uploadInfo, callback) {
    if (!res.locals.form) {
      // uploadInfo must contain either the name of the file field,
      // or an array looking like: [{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 8 }]
      let uploadFunction
      if (typeof uploadInfo === 'string') {
        uploadFunction = upload.single(uploadInfo)
      } else if (typeof uploadInfo === 'object') {
        uploadFunction = upload.fields(uploadInfo)
      } else {
        uploadFunction = upload.array()
      }

      uploadFunction(req, res, function () {
        let files = req.files
        if (!files) {
          files = {}
          files[uploadInfo] = req.file
        }
        res.locals.form = {
          fields: req.body,
          files
        }
        callback(null, res.locals.form)
      })
    } else {
      callback(null, res.locals.form)
    }
  })
  app.use(function (req, res, next) {
    // usage: let {fields, files} = await req.parseForm()
    req.parseForm = async function (uploadInfo) {
      return doParseForm(req, res, uploadInfo)
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
    if (res.locals.form) {
      for (let key in res.locals.form.files) {
        let fileInfo = res.locals.form.files[key]
        if (fileInfo) {
          fileStorage.remove(fileInfo.path)
        }
      }
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
      if (!devMode) {
        message = 'Something went wrong, sorry about that.'
      }
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
    stack,
    path: req.originalUrl // Needed by _page.html, normally added by anyPageMiddleware
  })
}

/**
 * Returns a middleware rendering the JavaScript bundle.
 */
function bundleJs (devMode) {
  const bundleJsMiddleware = browserifyMiddleware(
      path.join(ROOT_PATH, '/client/site.js'),
      { 'standalone': 'alakajam' })
  if (devMode) {
    return function (req, res, next) {
      bundleJsMiddleware(req, res, function error (err) {
        const errorString = '"Error during JavaScript server-side bundling:\\n' + err.toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
        const script = 'console.error(' + errorString + ');\ndocument.head.innerHTML = "";\ndocument.body.innerHTML = "<pre style=\\"white-space: pre-wrap\\">" + ' + errorString + ' + "</pre>";\n'
        res.set('Content-Type', 'text/javascript')
        res.send(script)
      })
    }
  } else {
    return bundleJsMiddleware
  }
}
