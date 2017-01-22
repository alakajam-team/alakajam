const Event = require('../models/eventModel')

module.exports = {

  initRoutes: function (app) {
    app.get('/event/:uuid', viewEvent)
  }

}

/**
 * Browse event
 */
async function viewEvent (req, res, next) {
  let event = await Event.where('id', req.params.uuid).fetch()
  if (event !== null) {
    res.render('event', { event: event })
  } else {
    res.locals.errorMessage = 'Event not found'
    next()
  }
}
