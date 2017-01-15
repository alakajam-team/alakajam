const Entry = require('../models/entry')

module.exports = {

  initRoutes: function (app) {
    app.get('/entry/:uuid', viewEntry)
    app.get('/entry/:uuid/edit', editEntry)
    app.post('/entry/:uuid/edit', saveEntry)
  }

}

// Entry view page
async function viewEntry (req, res) {
  let entry = await Entry.where('id', req.params.uuid).fetch()
  res.render('entry', { entry: entry })
}

// Entry edit page
async function editEntry (req, res) {
  // TODO
  res.end('edit')
}

// Entry save handling
async function saveEntry (req, res) {
  // TODO
  res.redirect('/entry/' + req.params.entryId)
}
