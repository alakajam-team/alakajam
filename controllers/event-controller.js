'use strict'

/**
 * Event pages
 *
 * @module controllers/event-controller
 */

const eventService = require('../services/event-service')

module.exports = {

  initRoutes: function (app) {
    app.use('/event/:uuid*', eventMiddleware)

    app.get('/event/:uuid', viewEvent)
  }

}

/**
 * Fetches the event & optionally the user's entry
 */
async function eventMiddleware (req, res, next) {
  let eventTask = await eventService.findEventById(req.params.uuid)
    .then(event => res.locals.event = event)
  let entryTask = true
  if (res.locals.user) {
    entryTask = eventService.findUserEntryForEvent(res.locals.user, req.params.uuid)
      .then(entry => res.locals.userEntry = entry)
  }
  await Promise.all([eventTask, entryTask])
  next()
}

/**
 * Browse event
 */
async function viewEvent (req, res) {
  if (res.locals.event) {
    res.render('event/view-event-games')
  } else {
    res.errorPage(404, 'Event not found')
  }
}
