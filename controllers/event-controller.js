'use strict'

/**
 * Event pages
 *
 * @module controllers/event-controller
 */

const eventService = require('../services/event-service')

module.exports = {
  eventMiddleware,
  viewEvent
}

/**
 * Fetches the event & optionally the user's entry
 */
async function eventMiddleware (req, res, next) {
  let event = await eventService.findEventByName(req.params.eventName)
  res.locals.event = event
  if (event && res.locals.user) {
    let userEntry = await eventService.findUserEntryForEvent(res.locals.user, event.get('id'))
    res.locals.userEntry = userEntry
  }
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
