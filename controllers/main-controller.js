'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')

module.exports = {

  initRoutes: function (app) {
    app.use('*', anyPageMiddleware)

    app.get('/', index)
    app.get('/events', events)
    app.get('/chat', chat)
  }

}

async function anyPageMiddleware (req, res, next) {
  sessionService.restoreSessionifNeeded(req, res)

  res.locals.path = req.originalUrl

  let liveEventTask = eventService.findEventByStatus('open').then(async function (liveEvent) {
    if (liveEvent) {
      res.locals.liveEvent = liveEvent
    } else {
      res.locals.nextEvent = await eventService.findEventByStatus('pending')
    }
  })
  let userTask = null
  if (req.session.userId) {
    userTask = userService.findById(req.session.userId).then(function (user) {
      res.locals.user = user
    })
  }
  await Promise.all([liveEventTask, userTask]) // Parallelize fetching event & user info

  next()
}

/**
 * Home page
 */
async function index (req, res) {
  if (res.locals.liveEvent) {
    res.locals.liveEvent.load('entries')
  }
  if (res.locals.nextEvent) {
    res.locals.nextEvent.load('entries')
  }
  res.render('index')
}

/**
 * Events listing
 */
async function events (req, res) {
  let eventModels = await eventService.findAllEvents()
  res.render('events', {
    events: eventModels
  })
}

/**
 * IRC Chat
 */
async function chat (req, res) {
  res.render('chat')
}
