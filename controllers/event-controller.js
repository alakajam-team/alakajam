'use strict'

/**
 * Event pages
 *
 * @module controllers/event-controller
 */

const forms = require('../core/forms')
const templating = require('../controllers/templating')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')

module.exports = {
  eventMiddleware,

  viewEventAnnouncements,
  viewEventPosts,
  viewEventThemes,
  viewEventGames,
  viewEventResults,

  editEvent,
  deleteEvent
}

/**
 * Fetches the event & optionally the user's entry
 */
async function eventMiddleware (req, res, next) {
  if (req.params.eventName !== 'create-event') {
    console.log(req.params)
    let event = await eventService.findEventByName(req.params.eventName)
    res.locals.event = event
    if (!event) {
      res.errorPage(404, 'Event not found')
      return
    } else {
      let announcementTask = postService.findLatestAnnouncement({ eventId: event.id })
          .then(function (announcement) {
            res.locals.latestEventAnnouncement = announcement
          })
      let entryTask = true
      if (res.locals.user) {
        entryTask = eventService.findUserEntryForEvent(res.locals.user, event.get('id'))
            .then(function (userEntry) {
              res.locals.userEntry = userEntry
            })
      }
      await Promise.all([announcementTask, entryTask])
    }
  }
  next()
}

/**
 * Browse event announcements
 */
async function viewEventAnnouncements (req, res) {
  res.render('event/view-event-announcements', {
    posts: await postService.findPosts({
      eventId: res.locals.event.get('id'),
      specialPostType: 'announcement'
    })
  })
}

/**
 * Browse event posts
 */
async function viewEventPosts (req, res) {
  let userPost
  if (res.locals.user) {
    let userPosts = await postService.findPosts({
      userId: res.locals.user.id,
      eventId: res.locals.event.id,
      specialPostType: null
    })
    userPost = (userPosts.models.length > 0) ? userPosts.models[0] : undefined
  }

  res.render('event/view-event-posts', {
    userPost: userPost,
    posts: await postService.findPosts({
      eventId: res.locals.event.get('id'),
      specialPostType: null
    })
  })
}

/**
 * Browse event theme voting
 */
async function viewEventThemes (req, res) {
  let statusThemes = res.locals.event.get('status_theme')
  if (forms.isId(statusThemes)) {
    res.locals.themesPost = await postService.findPostById(statusThemes)
  } else if (statusThemes !== 'on') {
    res.errorPage(404)
    return
  }

  res.render('event/view-event-themes')
}

/**
 * Browse event games
 */
async function viewEventGames (req, res) {
  if (res.locals.event.get('status_entry') !== 'on') {
    res.errorPage(404)
    return
  }

  res.render('event/view-event-games')
}

/**
 * Browse event results
 */
async function viewEventResults (req, res) {
  let statusResults = res.locals.event.get('status_results')
  if (forms.isId(statusResults)) {
    res.locals.resultsPost = await postService.findPostById(statusResults)
  } else if (statusResults !== 'on') {
    res.errorPage(404)
    return
  }

  res.render('event/view-event-results')
}

/**
 * Edit or create an event
 */
async function editEvent (req, res) {
  if (!securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
    return
  }

  let { fields } = await req.parseForm()
  let errorMessage = null
  let infoMessage = null
  let redirected = false

  if (fields && fields.name && fields.title) {
    let event = res.locals.event
    let creation = !event

    // TODO Typed fields should not be reset if validation fails
    if (!forms.isSlug(fields.name)) {
      errorMessage = 'Name is not a valid slug'
    } else if (fields.name.indexOf('-') === -1) {
      errorMessage = 'Name must contain at least one dash (-)'
    } else if (!forms.isIn(fields.status, ['pending', 'open', 'closed'])) {
      errorMessage = 'Invalid status'
    } else if (!forms.isIn(fields['status-theme'], ['disabled', 'off', 'on']) &&
        !forms.isId(fields['status-theme'])) {
      errorMessage = 'Invalid theme status'
    } else if (!forms.isIn(fields['status-entry'], ['disabled', 'off', 'on'])) {
      errorMessage = 'Invalid entry status'
    } else if (!forms.isIn(fields['status-results'], ['disabled', 'off', 'on']) &&
        !forms.isId(fields['status-results'])) {
      errorMessage = 'Invalid results status'
    } else if (event) {
      let matchingEventsCollection = await eventService.findEvents({ name: fields.name })
      for (let matchingEvent of matchingEventsCollection.models) {
        if (event.id !== matchingEvent.id) {
          errorMessage = 'Another event with the same exists'
        }
      }
    }

    if (!errorMessage) {
      if (creation) {
        event = eventService.createEvent()
      }

      event.set({
        title: forms.sanitizeString(fields.title),
        name: fields.name,
        display_dates: forms.sanitizeString(fields['display-dates']),
        display_theme: forms.sanitizeString(fields['display-theme']),
        status: fields.status,
        status_theme: fields['status-theme'],
        status_entry: fields['status-entry'],
        status_results: fields['status-results'],
        countdown_config: {
          date: forms.parseDateTime(fields['countdown-date']),
          phrase: forms.sanitizeString(fields['countdown-phrase'])
        }
      })

      let nameChanged = event.hasChanged('name')
      event = await event.save()
      if (nameChanged) {
        await eventService.refreshEventReferences(event)
      }

      if (creation) {
        res.redirect(templating.buildUrl(event, 'event', 'edit'))
        redirected = true
      }
    }
  }

  if (!redirected) {
    res.render('event/edit-event', {
      infoMessage,
      errorMessage
    })
  }
}

/**
 * Delete an event
 */
async function deleteEvent (req, res) {
  if (!securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
    return
  }

  await res.locals.event.destroy()
  res.redirect('/events')
}
