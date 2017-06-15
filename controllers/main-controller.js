'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const constants = require('../core/constants')
const forms = require('../core/forms')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')

module.exports = {
  anyPageMiddleware,

  index,
  events,
  announcements,
  article,
  chat
}

async function anyPageMiddleware (req, res, next) {
  res.locals.path = req.originalUrl

  // Fetch current user
  sessionService.restoreSessionIfNeeded(req, res)
  let userTask = null
  if (req.session.userId) {
    userTask = userService.findById(req.session.userId).then(function (user) {
      res.locals.user = user

      // Fetch comment to edit
      if (req.query.editComment && forms.isId(req.query.editComment)) {
        return postService.findCommentById(req.query.editComment).then(function (comment) {
          if (securityService.canUserWrite(user, comment, { allowMods: true })) {
            res.locals.editComment = comment
          }
        })
      }
    })
  }

  // Fetch live event
  let liveEventTask = eventService.findEventByStatus('open').then(async function (liveEvent) {
    if (liveEvent) {
      res.locals.liveEvent = liveEvent
    } else {
      res.locals.nextEvent = await eventService.findEventByStatus('pending')
    }
  })

  await Promise.all([liveEventTask, userTask]) // Parallelize fetching both

  next()
}

/**
 * Home page
 */
async function index (req, res) {
  if (res.locals.liveEvent) {
    await res.locals.liveEvent.load(['entries', 'entries.userRoles'])
  }
  let nextEventsCollection = await eventService.findEvents({status: 'pending'})
  res.render('index', {
    announcement: await postService.findLatestAnnouncement(),
    nextEvents: nextEventsCollection.models
  })
}

/**
 * Events listing
 */
async function events (req, res) {
  let eventsCollection = await eventService.findEvents()
  await eventsCollection.load('entries.userRoles')
  res.render('events', {
    events: eventsCollection.models
  })
}

/**
 * Announcements listing
 */
async function announcements (req, res) {
  res.render('announcements', {
    posts: await postService.findPosts({ specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT })
  })
}

/**
 * Articles
 */
async function article (req, res) {
  // postName context variable is used to add a relevant "create article" mod button
  res.locals.postName = forms.sanitizeString(req.params.name)
  res.locals.post = await postService.findPost({
    name: res.locals.postName,
    specialPostType: constants.SPECIAL_POST_TYPE_ARTICLE
  })
  if (res.locals.post) {
    res.render('article')
  } else {
    res.errorPage(404)
  }
}

/**
 * IRC Chat
 */
async function chat (req, res) {
  res.render('chat')
}
