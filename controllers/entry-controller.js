'use strict'

/**
 * Entry pages
 *
 * @module controllers/entry-controller
 */

const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const templating = require('./templating')
const postController = require('./post-controller')

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
  let entry = await eventService.findEntryById(req.params.entryId)
  if (!entry) {
    res.errorPage(404, 'Entry not found')
    return
  }
  res.locals.entry = entry

  if (req.params.eventName !== entry.get('event_name') ||
      req.params.entryName !== entry.get('name')) {
    res.redirect(templating.buildUrl(entry, 'entry', req.params.rest))
    return
  }

  next()
}

/**
 * Browse entry
 */
async function viewEntry (req, res) {
  res.render('entry/view-entry', {
    sortedComments: await postService.findCommentsSortedForDisplay(res.locals.entry),
    posts: await postService.findPosts({
      entryId: res.locals.entry.get('id')
    })
  })
}

/**
 * Edit entry
 */
async function createEntry (req, res) {
  if (!res.locals.user) {
    res.errorPage(403)
  } else if (await eventService.findUserEntryForEvent(res.locals.user, res.locals.event.id)) {
    res.errorPage(403, 'User already has an entry for this event')
  } else {
    res.render('entry/edit-entry')
  }
}

/**
 * Edit entry
 */
function editEntry (req, res) {
  if (!res.locals.user || !securityService.canUserWrite(res.locals.user, res.locals.entry, { allowMods: true })) {
    res.errorPage(403)
  } else {
    res.render('entry/edit-entry')
  }
}

/**
 * Save entry
 */
async function saveEntry (req, res) {
  let {fields, files} = await req.parseForm()

  if (fields['is-comment-form']) {
    // Handle comment form
    let redirectUrl = await postController.handleSaveComment(fields,
      res.locals.user, res.locals.entry, templating.buildUrl(res.locals.entry, 'entry'))
    res.redirect(redirectUrl)
  } else if (!res.locals.user || (res.locals.entry && !securityService.canUserWrite(res.locals.user, res.locals.entry, { allowMods: true }))) {
    res.errorPage(403)
  } else if (!res.headersSent) { // FIXME Why?
    // Update entry

    let errorMessage = null

    if (fields.link && !forms.isURL(fields.link)) {
      errorMessage = 'Invalid link'
    }

    if (!errorMessage) {
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

      entry.set('title', forms.sanitizeString(fields.title))
      entry.set('links', linksObject)
      entry.set('body', forms.sanitizeMarkdown(fields.body))
      if (fields['picture-delete'] && entry.get('pictures').length > 0) {
        await fileStorage.remove(entry.get('pictures')[0])
        entry.set('pictures', [])
      } else if (files.picture.size > 0) { // TODO Formidable shouldn't create an empty file
        let finalPath = await fileStorage.savePictureUpload(files.picture.path, picturePath)
        entry.set('pictures', [finalPath])
      }
      await entry.save()
      await entry.related('userRoles').fetch()

      res.redirect(templating.buildUrl(entry, 'entry'))
    } else {
      res.render('entry/edit-entry', {
        errorMessage
      })
    }
  }
}

async function deleteEntry (req, res) {
  await res.locals.entry.destroy()
  res.redirect(templating.buildUrl(res.locals.event, 'event'))
}
