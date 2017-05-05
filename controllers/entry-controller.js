'use strict'

/**
 * Entry pages
 *
 * @module controllers/entry-controller
 */

const eventService = require('../services/event-service')
const fileStorage = require('../core/file-storage')

module.exports = {

  initRoutes: function (app) {
    app.use('/entry/:uuid*', entryMiddleware)

    app.get('/entry/:uuid', viewEntry)
    app.get('/entry/:uuid/edit', editEntry)
    app.post('/entry/:uuid', saveEntry)
  }

}

/**
 * Fetches the current entry & event
 */
async function entryMiddleware (req, res, next) {
  let entry = await eventService.findEntryById(req.params.uuid)
  if (entry === null) {
    res.errorPage(404, 'Entry not found')
  } else {
    res.locals.entry = entry
    res.locals.event = entry.related('event')
    next()
  }
}

/**
 * Browse entry
 */
function viewEntry (req, res) {
  res.render('entry/view-entry')
}

/**
 * Edit entry
 */
function editEntry (req, res) {
  res.render('entry/edit-entry')
}

/**
 * Save entry
 */
async function saveEntry (req, res) {
  try {
    let [fields, files] = await req.parseForm()
    if (!res.headersSent) { // FIXME Why?
      let entry = res.locals.entry
      let picturePath = '/entry/' + entry.get('uuid')
      let linksObject = null
      if (fields.link) {
        linksObject = [{
          url: fields.link,
          title: 'Play'
        }]
      }

      entry.set('title', fields.title)
      entry.set('links', linksObject)
      entry.set('body', fields.body)
      if (fields.pictureDelete) {
        fileStorage.remove(picturePath)
      } else if (files.picture.size > 0) { // TODO Formidable shouldn't create an empty file
        let finalPath = await fileStorage.move(files.picture.path, picturePath)
        entry.set('pictures', [finalPath])
      }
      await entry.save()

      viewEntry(req, res)
    }
  } catch (e) {
    res.errorPage(500, e)
  }
}
