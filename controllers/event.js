'use strict'

/**
 * Event pages
 * 
 * @module controllers/event
 */

const eventService = require('../services/event-service')

module.exports = {

  initRoutes: function (app) {
    app.get('/event/:uuid', viewEvent)
  }

}

/**
 * Browse event
 */
async function viewEvent (req, res, next) {
  let event = await eventService.findEventById(req.params.uuid)
  if (event !== null) {
    res.render('event', {
      event: event
    })
  } else {
    res.locals.errorMessage = 'Event not found'
    next()
  }
}
