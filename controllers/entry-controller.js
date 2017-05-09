'use strict'

/**
 * Entry pages
 *
 * @module controllers/entry-controller
 */

const eventService = require('../services/event-service')
const Entry = require('../models/entry-model')
const fileStorage = require('../core/file-storage')
const templating = require('./templating')

module.exports = {

  initRoutes: function (app) {
    app.use('/entry/:uuid*', entryMiddleware)
    app.use('/event/:eventUuid*', entryMiddleware)

    app.get('/event/:eventUuid/create-entry', createEntry)
    app.post('/event/:eventUuid/create-entry', saveEntry)
    app.get('/entry/:uuid', viewEntry)
    app.post('/entry/:uuid', saveEntry)
    app.get('/entry/:uuid/edit', editEntry)
    app.get('/entry/:uuid/delete', deleteEntry)
  }

}

/**
 * Fetches the current entry & event
 */
async function entryMiddleware (req, res, next) {
  if (req.params.uuid) {
    let entry = await eventService.findEntryById(req.params.uuid)
    if (entry === null) {
      res.errorPage(404, 'Entry not found')
    } else {
      res.locals.entry = entry
      res.locals.event = entry.related('event')
      next()
    }
  }
  if (req.params.eventUuid) {
    res.locals.event = await eventService.findEventById(req.params.eventUuid)
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
async function createEntry (req, res) {
  res.render('entry/edit-entry', {entry: new Entry({
    event_uuid: res.locals.event.get('uuid')
  })})
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
  let {fields, files} = await req.parseForm()
  if (!res.headersSent) { // FIXME Why?
    if (!res.locals.entry) {
      res.locals.entry = await eventService.createEntry(res.locals.user, res.locals.event)
    }
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
    if (fields['picture-delete'] && entry.get('pictures').length > 0) {
      await fileStorage.remove(entry.get('pictures')[0], false)
      entry.set('pictures', [])
    } else if (files.picture.size > 0) { // TODO Formidable shouldn't create an empty file
      let finalPath = await fileStorage.move(files.picture.path, picturePath)
      entry.set('pictures', [finalPath])
    }
    await entry.save()
    await entry.related('userRoles').fetch()

    viewEntry(req, res)
  }
}

async function deleteEntry (req, res, next) {
  await res.locals.entry.destroy()
  req.url = templating.buildUrl(res.locals.event, 'event')
  next()
}