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
  people,
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
  let context = {}

  if (res.locals.liveEvent) {
    // Find live event and its latest announcement
    await res.locals.liveEvent.load(['entries', 'entries.userRoles'])
    context.liveEventAnnouncement = await postService.findLatestAnnouncement({ eventId: res.locals.liveEvent.get('id') })
    context.homeAnnouncement = context.liveEventAnnouncement
  } else {
    // Find next events
    let nextEventsCollection = await eventService.findEvents({status: 'pending'})
    context.nextEvents = nextEventsCollection.models

    // Gather the latest announcements for all next events
    context.nextEventsAnnouncements = []
    context.homeAnnouncement = null
    for (let nextEvent of context.nextEvents) {
      let nextEventAnnouncement = await postService.findLatestAnnouncement({ eventId: nextEvent.get('id') })
      context.nextEventsAnnouncements.push(nextEventAnnouncement)
      if (!context.homeAnnouncement) {
        context.homeAnnouncement = nextEventAnnouncement
      }
    }
  }

  // Gather any user posts
  let postsCollection = await postService.findPosts({specialPostType: null})
  await postsCollection.load(['entry', 'event', 'entry.userRoles'])
  context.posts = postsCollection.models

  res.render('index', context)
}

/**
 * Events listing
 */
async function events (req, res) {
  let [pendingCollection, openCollection, closedCollection] = await Promise.all([
    await eventService.findEvents({status: 'pending'}),
    await eventService.findEvents({status: 'open'}),
    await eventService.findEvents({status: 'closed'})
  ])
  res.render('events', {
    pending: pendingCollection.models,
    open: openCollection.models,
    closed: closedCollection.models
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
 * People listing
 */
async function people (req, res) {
  let usersCollection = await userService.findAll()
  res.render('people', {
    users: usersCollection.sortBy((user) => -user.get('id'))
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
    specialPostType: constants.SPECIAL_POST_TYPE_ARTICLE,
    allowDrafts: true
  })

  if (res.locals.post && (postService.isPast(res.locals.post.get('published_at')) ||
      securityService.canUserRead(res.locals.user, res.locals.post, { allowMods: true }))) {
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
