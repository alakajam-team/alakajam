'use strict'

const log = require('../lib/log')
const Event = require('../models/eventModel')

module.exports = {

  initRoutes: function (app) {
    app.get('/', index)
    app.get('/chat', chat)
    app.get('/admin', resetDb)
  }

}

/**
 * Home page
 */
async function index (req, res) {
  try {
    let events = await new Event().fetchAll({ withRelated: 'entries' })
    res.render('index', { events: events.models })
  } catch (e) {
    log.error(e.message)
    res.end('error: ' + e.message)
  }
}

/**
 * IRC Chat
 */
async function chat (req, res) {
  res.render('chat')
}

/**
 * XXX Temporary
 * Resets the DB
 */
async function resetDb (req, res) {
  const db = require('../lib/db')
  await db.dropCreateTables()
  await db.insertSamples()
  res.end('DB reset done.')
}
