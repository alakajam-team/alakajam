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

/**
 * XXX Temporary admin page
 * Resets the DB
 */
async function resetDb (req, res) {
  const db = require('../core/db')
  await db.dropTables()
  await db.upgradeTables()
  await db.insertSamples()
  let version = await db.findCurrentVersion()
  res.end('DB reset done (current version : ' + version + ').')
}
