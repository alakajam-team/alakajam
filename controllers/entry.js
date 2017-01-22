const Entry = require('../models/entryModel')

module.exports = {

  initRoutes: function (app) {
    app.get('/entry/:uuid', viewEntry)
    app.get('/entry/:uuid/edit', editEntry)
    app.post('/entry/:uuid/edit', saveEntry)
  }

}

/**
 * Browse entry
 */
async function viewEntry (req, res, next) {
  let entry = await Entry.where('id', req.params.uuid).fetch({ withRelated: 'event' })
  if (entry !== null) {
    res.render('entry', {
      entry: entry,
      event: entry.related('event')
    })
  } else {
    res.locals.errorMessage = 'Entry not found'
    next()
  }
}

/**
 * Edit entry
 */
async function editEntry (req, res) {
  // TODO
  res.end('edit')
}

/**
 * Save entry
 */
async function saveEntry (req, res) {
  // TODO
  res.redirect('/entry/' + req.params.entryId)
}
