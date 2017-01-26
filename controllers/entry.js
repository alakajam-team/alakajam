'use strict'

const formidable = require('formidable')
const promisify = require('promisify-node')
const fs = promisify('fs')
const path = require('path')
const log = require('../lib/log')
const Entry = require('../models/entryModel')

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
  let entry = await Entry.where('id', req.params.uuid).fetch({ withRelated: 'event' })
  if (entry === null) {
    res.error(404, 'Entry not found')
  } else {
    res.locals.entry = entry
    res.locals.event = entry.related('event')
  }
  next()
}

/**
 * Browse entry
 */
function viewEntry (req, res) {
  res.render('entry', {
    entry: res.locals.entry,
    event: res.locals.event
  })
}

/**
 * Edit entry
 */
function editEntry (req, res) {
  res.render('entry-edit', {
    entry: res.locals.entry,
    event: res.locals.event
  })
}

/**
 * Save entry
 */
async function saveEntry (req, res) {
  try {
    let [fields, files] = await req.parseForm()
    if (!res.headersSent) { // FIXME Why?
      let entry = res.locals.entry
      entry.set('title', fields.title)
      entry.set('link', fields.link || undefined)
      entry.set('description', fields.description)
      if (fields.pictureDelete) {
        entry.set('picture', null)
      } else if (files.picture.size > 0) { // TODO Formidable shouldn't create an empty file
        // TODO Consts import to hold paths and URLs
        let newFilename = entry.get('id') + path.extname(files.picture.path)
        let newPath = path.join(__dirname, '../static/uploads', newFilename)
        await fs.rename(files.picture.path, newPath)
        entry.set('picture', '/static/uploads/' + newFilename)
      }
      entry.save()
      viewEntry(req, res)
    }
  } catch (e) {
    res.errorPage(500, e.message)
  }
}
