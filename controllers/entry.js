const formidable = require('formidable')
const Entry = require('../models/entryModel')

module.exports = {

  initRoutes: function (app) {
    app.use('/entry/:uuid\*', fetchFilter)
    
    app.get('/entry/:uuid', viewEntry)
    app.get('/entry/:uuid/edit', editEntry)
    app.post('/entry/:uuid/edit', saveEntry)
  }

}

/**
 * Fetches the current entry & event
 */
async function fetchFilter (req, res, next) {
  let entry = await Entry.where('id', req.params.uuid).fetch({ withRelated: 'event' })
  if (entry === null) {
    res.locals.errorMessage = 'Entry not found'
    res.error404()
  } else {
    res.locals.entry = entry
    res.locals.event = entry.related('event')
  }
  next()
}

/**
 * Browse entry
 */
async function viewEntry (req, res) {
  res.render('entry', {
    entry: res.locals.entry,
    event: res.locals.event
  })
}

/**
 * Edit entry
 */
async function editEntry (req, res) {
  res.render('entry-edit', {
    entry: res.locals.entry,
    event: res.locals.event
  })
}

/**
 * Save entry
 */
async function saveEntry (req, res) {
  let form = new formidable.IncomingForm()
  form.parse(req, function (error, fields, files) {
    if (error) {
      // TODO 500 page (replace error404 method with a more generic one)
      res.end(error)
    } else {
      // TODO Save uploaded file, escape input
      let entry = res.locals.entry
      entry.set('title', fields.title)
      entry.set('link', fields.link)
      entry.set('description', fields.description)
      entry.save()
      
      res.redirect('/entry/' + req.params.uuid)
    }
  })
}
