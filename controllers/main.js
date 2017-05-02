'use strict'

const log = require('../lib/log')
const Event = require('../models/eventModel')

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
  res.locals.liveEvent  = await new Event().fetch() // XXX Temporary query
  next()
}

/**
 * Home page
 */
async function index (req, res) {
  try {
    if (res.locals.liveEvent) {
      // Fetch related entries
      let liveEventId = res.locals.liveEvent['id']
      let liveEventModel = await new Event({ id: liveEventId })
        .fetch({ withRelated: 'entries' })
      res.locals.liveEvent = liveEventModel
    }
    res.render('index')
  } catch (e) {
    // TODO Normalize error handling
    log.error(e.message)
    res.end('error: ' + e.message)
  }
}

/**
 * Events listing
 */
async function events (req, res) {
  let eventModels = await new Event().fetchAll({ withRelated: 'entries' })
  res.render('events', {
    events: eventModels.models
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
  const db = require('../lib/db')
  await db.dropCreateTables()
  await db.insertSamples()
  res.end('DB reset done.')
}
