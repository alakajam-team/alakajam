'use strict'

/**
 * Global pages
 *
 * @module controllers/main
 */

const eventService = require('../services/event-service')

module.exports = {

  initRoutes: function (app) {
    app.use('*', anyPageMiddleware)

    app.get('/', index)
    app.get('/events', events)
    app.get('/chat', chat)
  }

}

async function anyPageMiddleware (req, res, next) {
  res.locals.path = req.originalUrl
  res.locals.liveEvent = await eventService.findEventByStatus('open')
  if (!res.locals.liveEvent) {
    res.locals.nextEvent = await eventService.findEventByStatus('pending')
  }

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
