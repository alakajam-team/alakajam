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
async function viewEntry (req, res) {
  let entry = await Entry.where('id', req.params.uuid).fetch()
  res.render('entry', { entry: entry })
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
