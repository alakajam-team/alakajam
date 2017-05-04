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
    app.get('/admin', resetDb)
  }

}

async function anyPageMiddleware (req, res, next) {
  res.locals.liveEvent = await eventService.findLiveEvent()
  next()
}

/**
 * Home page
 */
async function index (req, res) {
  if (res.locals.liveEvent) {
    // Fetch related entries
    let liveEventId = res.locals.liveEvent['id']
    let liveEventModel = await eventService.findEventById(liveEventId)
    res.locals.liveEvent = liveEventModel
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

/**
 * XXX Temporary admin page
 * Resets the DB
 */
async function resetDb (req, res) {
  const db = require('../core/db')
  await db.dropCreateTables()
  await db.insertSamples()
  res.end('DB reset done.')
}
