'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const constants = require('../core/constants')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const postService = require('../services/post-service')

module.exports = {
  anyPageMiddleware,
  index,
  events,
  chat
}

async function anyPageMiddleware (req, res, next) {
  sessionService.restoreSessionIfNeeded(req, res)

  res.locals.path = req.originalUrl

  let liveEventTask = eventService.findEventByStatus('open').then(async function (liveEvent) {
    if (liveEvent) {
      res.locals.liveEvent = liveEvent
    } else {
      res.locals.nextEvent = await eventService.findEventByStatus('pending')
    }
  })
  let userTask = null
  if (req.session.userId) {
    userTask = userService.findById(req.session.userId).then(function (user) {
      res.locals.user = user
    })
  }
  await Promise.all([liveEventTask, userTask]) // Parallelize fetching event & user info

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
    posts: await postService.findPosts({ specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT }),
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
 * IRC Chat
 */
async function chat (req, res) {
  res.render('chat')
}
