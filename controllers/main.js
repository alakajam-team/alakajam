'use strict'

const log = require('../lib/log')
const Event = require('../models/eventModel')

module.exports = {

  initRoutes: function (app) {
    app.get('/', index)
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
