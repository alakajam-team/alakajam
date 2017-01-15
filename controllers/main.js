'use strict'

const log = require('../lib/log')
const Event = require('../models/event')

module.exports = {

  initRoutes: function (app) {
    app.get('/', index)
    app.get('*', error404)
  }

}

// Home page
async function index (req, res) {
  try {
    let events = await new Event().fetchAll({ withRelated: 'entries' })
    res.render('index', { events: events.models })
  } catch (e) {
    log.error(e.message)
    res.end('error: ' + e.message)
  }
}

// 404 page
function error404 (req, res) {
  res.status(404)
  res.end('404')
}
