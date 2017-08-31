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
const eventRatingService = require('../services/event-rating-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const templating = require('./templating')
const postController = require('./post-controller')
const cache = require('../core/cache')
const constants = require('../core/constants')

module.exports = {
  entryMiddleware,

  viewEntry,
  createEntry,
  editEntry,
  saveEntry,
  deleteEntry,
  leaveEntry,

  acceptInvite,
  declineInvite,

  searchForTeamMate,
  searchForExternalEvents
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

  if (req.params.eventName !== 'external-entry' &&
      (req.params.eventName !== entry.get('event_name') || req.params.entryName !== entry.get('name'))) {
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

  // Fetch vote on someone else's entry
  let vote
  let canVote = false
  if (res.locals.user && !securityService.canUserWrite(res.locals.user, res.locals.entry)) {
    canVote = await eventRatingService.canVoteOnEntry(res.locals.user, res.locals.entry)
    if (canVote) {
      vote = await eventRatingService.findEntryVote(res.locals.user, res.locals.entry)
    }
  }

  res.render('entry/view-entry', {
    sortedComments: await postService.findCommentsSortedForDisplay(res.locals.entry),
    posts: await postService.findPosts({
      entryId: res.locals.entry.get('id')
    }),
    vote,
    canVote,
    external: !res.locals.event
  })
}

/**
 * Creates an entry, including one for an external event (res.locals.event not set).
 */
async function createEntry (req, res) {
  if (!res.locals.user) {
    res.errorPage(403)
    return
  } else if (res.locals.event && !eventService.areSubmissionsAllowed(res.locals.event)) {
    res.errorPage(403, 'Submissions are closed for this event')
    return
  } else if (res.locals.event) {
    let existingEntry = await eventService.findUserEntryForEvent(res.locals.user, res.locals.event.id)
    if (existingEntry) {
      res.redirect(templating.buildUrl(existingEntry, 'entry', 'edit'))
      return
    }
  }

  let entry = new models.Entry()
  if (res.locals.event) {
    entry.set({
      event_id: res.locals.event ? res.locals.event.get('id') : null,
      event_name: res.locals.event.get('name')
    })
  }

  res.render('entry/edit-entry', {
    entry,
    members: await eventService.findTeamMembers(null, res.locals.user),
    external: !res.locals.event
  })
}

/**
 * Edit entry
 */
async function editEntry (req, res) {
  if (!res.locals.user || !securityService.canUserWrite(res.locals.user, res.locals.entry, { allowMods: true })) {
    res.errorPage(403)
  } else {
    res.render('entry/edit-entry', {
      members: await eventService.findTeamMembers(res.locals.entry, res.locals.user),
      external: !res.locals.event
    })
  }
}

/**
 * Save entry
 */
async function saveEntry (req, res) {
  let {fields, files} = await req.parseForm()
  let entry = res.locals.entry

  if (fields['action'] === 'comment') {
    // Handle comment form
    let redirectUrl = await postController.handleSaveComment(fields,
      res.locals.user, entry, templating.buildUrl(entry, 'entry'))
    res.redirect(redirectUrl)
  } else if (fields['action'] === 'vote') {
    // Handle vote on entry
    let i = 1
    let votes = []
    while (fields['vote-' + i] !== undefined) {
      let vote = fields['vote-' + i]
      if (!vote || forms.isFloat(vote)) {
        votes.push(vote)
      } else {
        break
      }
      i++
    }
    if (await eventRatingService.canVoteOnEntry(res.locals.user, res.locals.entry)) {
      await eventRatingService.saveEntryVote(res.locals.user, res.locals.entry, votes)
    }
    viewEntry(req, res)
  } else if (!res.locals.user || (res.locals.entry &&
      !securityService.canUserWrite(res.locals.user, res.locals.entry, { allowMods: true }))) {
    res.errorPage(403)
  } else if (!res.headersSent) { // FIXME Why?
    let errorMessage = null

    // Links/platform parsing and validation
    let isExternalEvent = fields['external-event'] !== undefined
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
    } else if (!entry && !isExternalEvent && !eventService.areSubmissionsAllowed(res.locals.event)) {
      errorMessage = 'Submissions are closed for this event'
    } else if (files.picture.size > 0 && !fileStorage.isValidPicture(files.picture.path)) {
      errorMessage = 'Invalid picture format (allowed: PNG GIF JPG)'
    } else if (['solo', 'team', 'unranked'].indexOf(fields['division']) === -1) {
      errorMessage = 'Invalid division'
    } else if (typeof fields.members !== 'string') {
      errorMessage = 'Invalid members'
    }

    // Make sure the entry owner is not removed
    let teamMembers = fields.members.split(',').map(s => parseInt(s))
    let ownerId
    if (entry) {
      ownerId = entry.related('userRoles')
        .findWhere({ permission: constants.PERMISSION_MANAGE })
        .get('user_id')
    } else {
      ownerId = res.locals.user.get('id')
    }
    if (!teamMembers.includes(ownerId)) {
      teamMembers.push(ownerId)
    }

    // Entry update
    if (!errorMessage) {
      let isCreation
      if (!entry) {
        isCreation = true
        res.locals.entry = await eventService.createEntry(res.locals.user, res.locals.event)
        entry = res.locals.entry
      } else {
        isCreation = false
      }

      let picturePath = '/entry/' + entry.get('id')
      entry.set({
        'title': forms.sanitizeString(fields.title),
        'description': forms.sanitizeString(fields.description),
        'links': links,
        'platforms': platforms
      })

      if (fields['external-event']) {
        entry.set({
          event_id: null,
          event_name: null,
          external_event: forms.sanitizeString(fields['external-event'])
        })
      }

      if (fields['picture-delete'] && entry.get('pictures').length > 0) {
        await fileStorage.remove(entry.get('pictures')[0])
        entry.set('pictures', [])
      } else if (files.picture.size > 0) { // TODO Formidable shouldn't create an empty file
        let finalPath = await fileStorage.savePictureUpload(files.picture.path, picturePath)
        entry.set('pictures', [finalPath])
      }

      let entryDetails = entry.related('details')
      entryDetails.set('body', forms.sanitizeMarkdown(fields.body))

      if (isCreation || securityService.canUserManage(res.locals.user, entry, { allowMods: true })) {
        entry.set('division', fields['division'])
        let teamChanges = await eventService.setTeamMembers(res.locals.user, entry, teamMembers)
        res.locals.infoMessage = ''
        if (teamChanges.numAdded > 0) {
          res.locals.infoMessage += teamChanges.numAdded + ' user(s) have been sent an invite to join your team. '
        }
        if (teamChanges.numRemoved > 0) {
          res.locals.infoMessage += teamChanges.numRemoved + ' user(s) have been removed from the team.'
        }
      }

      if (entry.hasChanged('platforms')) {
        await eventService.refreshEntryPlatforms(entry)
      }
      await entryDetails.save()
      await entry.save()

      cache.user(res.locals.user).del('latestEntry')

      await entry.load(['userRoles.user', 'comments'])

      viewEntry(req, res)
    } else {
      if (!entry) {
        // Creation form
        res.locals.entry = new models.Entry()
        if (res.locals.event) {
          entry.set({
            event_id: res.locals.event ? res.locals.event.get('id') : null,
            event_name: res.locals.event.get('name')
          })
        }
      }

      res.render('entry/edit-entry', {
        errorMessage,
        members: await eventService.findTeamMembers(res.locals.entry, res.locals.user),
        external: !res.locals.event
      })
    }
  }
}

/**
 * Deletes an entry
 */
async function deleteEntry (req, res) {
  let entry = res.locals.entry
  if (res.locals.user && entry && securityService.canUserManage(res.locals.user, entry, { allowMods: true })) {
    await eventService.deleteEntry(entry)
    cache.user(res.locals.user).del('latestEntry')
  }

  if (res.locals.event) {
    res.redirect(templating.buildUrl(res.locals.event, 'event'))
  } else {
    res.redirect(templating.buildUrl(res.locals.user, 'user', 'entries'))
  }
}

/**
 * Leaves the team of an entry
 */
async function leaveEntry (req, res) {
  let entry = res.locals.entry
  let user = res.locals.user

  if (user && entry) {
    // Remove requesting user from the team
    let newTeamMembers = []
    entry.related('userRoles').each(function (userRole) {
      if (userRole.get('user_id') !== user.get('id')) {
        newTeamMembers.push(userRole.get('user_id'))
      }
    })
    await eventService.setTeamMembers(user, entry, newTeamMembers)

    cache.user(user).del('latestEntry')
  }

  if (res.locals.event) {
    res.redirect(templating.buildUrl(res.locals.event, 'event'))
  } else {
    res.redirect(templating.buildUrl(res.locals.user, 'user', 'entries'))
  }
}

/**
 * Accept an invite to join an entry's team
 */
async function acceptInvite (req, res) {
  await eventService.acceptInvite(res.locals.user, res.locals.entry)
  res.redirect(templating.buildUrl(res.locals.entry, 'entry'))
}

/**
 * Decline an invite to join an entry's team
 */
async function declineInvite (req, res) {
  await eventService.deleteInvite(res.locals.user, res.locals.entry)
  res.redirect(templating.buildUrl(res.locals.user, 'user', 'feed'))
}

/**
 * Search for team mates with usernames matching a string
 * @param {string} req.query.name a string to search user names with.
 */
async function searchForTeamMate (req, res) {
  let errorMessage
  if (!req.query || !req.query.name) {
    errorMessage = 'No search parameter'
  }
  const nameFragment = forms.sanitizeString(req.query.name)
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`
  } else if (req.query.entryId && !forms.isId(req.query.entryId)) {
    errorMessage = 'Invalid entry ID'
  }

  if (!errorMessage) {
    let entry = null
    if (req.query.entryId) {
      entry = await eventService.findEntryById(req.query.entryId)
    }

    const matches = await eventService.searchForTeamMembers(nameFragment,
      res.locals.event ? res.locals.event.id : null, entry)

    const entryId = entry ? entry.get('id') : -1
    const getStatus = (match) => {
      switch (match.node_id) {
        case null: return 'available'
        case entryId: return 'member'
        default: return 'unavailable'
      }
    }

    const responseData = {
      matches: matches.map(match => ({
        id: match.id,
        text: match.title,
        status: getStatus(match)
      }))
    }
    res.json(responseData)
  } else {
    res.json(400, { error: errorMessage })
  }
}

/**
 * AJAX endpoint : Finds external event names
 */
async function searchForExternalEvents (req, res) {
  let errorMessage

  if (!req.query || !req.query.name) {
    errorMessage = 'No search parameter'
  }
  const nameFragment = forms.sanitizeString(req.query.name)
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`
  }

  if (!errorMessage) {
    let results = await eventService.searchForExternalEvents(nameFragment)
    res.json(results)
  } else {
    res.json(400, { error: errorMessage })
  }
}
