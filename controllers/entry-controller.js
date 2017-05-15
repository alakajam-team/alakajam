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
  entryMiddleware,
  createEntry,
  saveEntry,
  viewEntry,
  editEntry,
  deleteEntry
}

/**
 * Fetches the current entry & event
 */
async function entryMiddleware (req, res, next) {
  if (req.params.id) {
    let entry = await eventService.findEntryById(req.params.id)
    if (entry === null) {
      res.errorPage(404, 'Entry not found')
    } else {
      res.locals.entry = entry
      res.locals.event = entry.related('event')
      next()
    }
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
    event_id: res.locals.event.get('id'),
    event_name: res.locals.event.get('name')
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

    let picturePath = '/entry/' + entry.get('id')
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

async function deleteEntry (req, res) {
  await res.locals.entry.destroy()
  res.redirect(templating.buildUrl(res.locals.event, 'event'))
}
