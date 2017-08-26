'use strict'

/**
 * Entry pages
 *
 * @module controllers/entry-controller
 */

const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
const models = require('../core/models')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const templating = require('./templating')
const postController = require('./post-controller')
const cache = require('../core/cache')

module.exports = {
  entryMiddleware,

  viewEntry,
  createEntry,
  editEntry,
  saveEntry,
  deleteEntry,

  manageTeam,
  saveTeam,
  searchForTeamMate
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
  res.locals.pageTitle = entry.get('title')
  res.locals.pageDescription = entry.get('description') || forms.markdownToText(entry.related('details').get('body'))
  if (entry.get('pictures') && entry.get('pictures').length > 0) {
    res.locals.pageImage = entry.get('pictures')[0]
  }

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
  // Let the template display user thumbs
  await res.locals.entry.load('userRoles.user')

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
  } else if (!eventService.areSubmissionsAllowed(res.locals.event)) {
    res.errorPage(403, 'Submissions are closed for this event')
  } else {
    let existingEntry = await eventService.findUserEntryForEvent(res.locals.user, res.locals.event.id)
    if (existingEntry) {
      res.redirect(templating.buildUrl(existingEntry, 'entry', 'edit'))
    } else {
      res.render('entry/edit-entry', {
        entry: new models.Entry({
          event_id: res.locals.event.get('id'),
          event_name: res.locals.event.get('name')
        })
      })
    }
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
  } else if (!res.locals.user || (res.locals.entry &&
      !securityService.canUserWrite(res.locals.user, res.locals.entry, { allowMods: true }))) {
    res.errorPage(403)
  } else if (!res.headersSent) { // FIXME Why?
    let errorMessage = null

    // Links/platform parsing and validation
    let links = []
    let platforms = []
    let i = 0
    while (fields['url' + i]) {
      let label = forms.sanitizeString(fields['label' + i])
      let url = fields['url' + i]
      if (label === 'other') {
        label = forms.sanitizeString(fields['customlabel' + i])
        platforms.push('other')
      } else {
        platforms.push(label)
      }

      if (!forms.isURL(url) || !label) {
        errorMessage = 'Link #' + i + ' is invalid'
        break
      }
      links.push({
        label,
        url
      })
      i++
    }
    if (!forms.isLengthValid(links, 1000)) {
      errorMessage = 'Too many links (max allowed: around 7)'
    } else if (!res.locals.entry && !eventService.areSubmissionsAllowed(res.locals.event)) {
      errorMessage = 'Submissions are closed for this event'
    } else if (files.picture.size > 0 && !fileStorage.isValidPicture(files.picture.path)) {
      console.log(files.picture.path)
      errorMessage = 'Invalid picture format (allowed: PNG GIF JPG)'
    }

    // Entry update
    if (!errorMessage) {
      if (!res.locals.entry) {
        res.locals.entry = await eventService.createEntry(res.locals.user, res.locals.event)
      }
      let entry = res.locals.entry

      let picturePath = '/entry/' + entry.get('id')
      entry.set('title', forms.sanitizeString(fields.title))
      entry.set('category', forms.sanitizeString(fields.category) || 'solo')
      entry.set('description', forms.sanitizeString(fields.description))
      entry.set('links', links)
      entry.set('platforms', platforms)
      if (fields['picture-delete'] && entry.get('pictures').length > 0) {
        await fileStorage.remove(entry.get('pictures')[0])
        entry.set('pictures', [])
      } else if (files.picture.size > 0) { // TODO Formidable shouldn't create an empty file
        let finalPath = await fileStorage.savePictureUpload(files.picture.path, picturePath)
        entry.set('pictures', [finalPath])
      }

      let entryDetails = entry.related('details')
      entryDetails.set('body', forms.sanitizeMarkdown(fields.body))

      if (entry.hasChanged('platforms')) {
        await eventService.refreshEntryPlatforms(entry)
      }
      await entryDetails.save()
      await entry.save()

      cache.user(res.locals.user).del('latestEntries')

      await entry.related('userRoles').fetch()
      res.redirect(templating.buildUrl(entry, 'entry'))
    } else {
      if (!res.locals.entry) {
        // Creation form
        res.locals.entry = new models.Entry({
          event_id: res.locals.event.get('id'),
          event_name: res.locals.event.get('name')
        })
      }

      res.render('entry/edit-entry', {
        errorMessage
      })
    }
  }
}

async function deleteEntry (req, res) {
  await res.locals.entry.destroy()
  cache.user(res.locals.user).del('latestEntries')
  res.redirect(templating.buildUrl(res.locals.event, 'event'))
}

/**
 * Manage entry team
 */
async function manageTeam (req, res) {
  if (!res.locals.user || !securityService.canUserWrite(res.locals.user, res.locals.entry, { allowMods: true })) {
    res.errorPage(403)
    return
  }

  const roles = res.locals.entry.related('userRoles')
    .sortBy(role => role.get('user_name'))
  res.render('entry/manage-team', {
    roles
  })
}

/**
 * Save team members to entry
 */
async function saveTeam (req, res) {
  const {user, entry, event} = res.locals
  if (
    !user || !entry || !event ||
    !securityService.canUserWrite(user, entry, { allowMods: true })
  ) {
    res.errorPage(400, `Invalid arguments: ${user}, ${entry}, ${event}`)
    return
  }

  const {fields} = await req.parseForm()
  if (typeof fields.members !== 'string') {
    res.errorPage(400, 'Invalid members')
    return
  }
  const names = fields.members.split(',').map(s => forms.sanitizeString(s))
  if (!names.includes(user.get('name'))) {
    res.errorPage(400, 'Can\'t remove owner from team entry')
    return
  }

  const entryId = res.locals.entry.id
  const result = await eventService.setTeamMembers({ entry, event, names })
  const members = []
  const conflicts = []
  for (let role of result.alreadyEntered) {
    (role.node_id === entryId ? members : conflicts).push({
      id: role.user_name,
      text: role.user_title
    })
  }
  res.json({
    numRemoved: result.numRemoved,
    numAdded: result.numAdded,
    members,
    conflicts
  })
}

/**
 * Search for team mates with usernames matching a string
 * @param {string} req.query.name a string to search user names with.
 */
async function searchForTeamMate (req, res) {
  if (!req.query || !req.query.name) {
    res.errorPage(400, 'No search parameter')
    return
  }
  const nameFragment = forms.sanitizeString(req.query.name)
  if (!nameFragment || nameFragment.length < 3) {
    res.errorPage(400, `Invalid name fragment: '${req.query.name}'`)
    return
  }

  const matches = await eventService.searchForTeamMembers({
    nameFragment,
    eventId: res.locals.event.id
  })

  const entryId = res.locals.entry.id
  const getStatus = (match) => {
    switch (match.node_id) {
      case null: return 'available'
      case entryId: return 'member'
      default: return 'unavailable'
    }
  }

  const responseData = {
    matches: matches.map(match => ({
      id: match.name,
      text: match.title,
      status: getStatus(match)
    }))
  }
  res.json(responseData)
}
