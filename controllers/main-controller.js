'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const forms = require('../core/forms')
const constants = require('../core/constants')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const settingService = require('../services/setting-service')
const cacheProvider = require('../core/cache')

module.exports = {
  anyPageMiddleware,

  index,
  events,
  people,
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

  // Fetch featured event
  let featuredEventTask = settingService.find(constants.SETTING_FEATURED_EVENT_NAME)
    .then(function (featuredEventName) {
      if (featuredEventName) {
        return eventService.findEventByName(featuredEventName)
      }
    }).then(function (featuredEvent) {
      if (featuredEvent) {
        res.locals.featuredEvent = featuredEvent
      }
    })

  await Promise.all([featuredEventTask, userTask]) // Parallelize fetching both

  // update unread notifications (from cache if possible)
  if (res.locals.user) {
    if (cacheProvider.cache.get(res.locals.user.get('name').toLowerCase() + '_unreadNotifications') === undefined) {
      let commentsCollection = await postService.findCommentsToUser(res.locals.user, { notifications_last_read: true })
      res.locals.unreadNotifications = commentsCollection.length
      cacheProvider.cache.set(res.locals.user.get('name').toLowerCase() + '_unreadNotifications', res.locals.unreadNotifications)
    } else {
      res.locals.unreadNotifications = cacheProvider.cache.get(res.locals.user.get('name').toLowerCase() + '_unreadNotifications')
    }
  }

  next()
}

/**
 * Home page
 */
async function index (req, res) {
  let context = {}

  let featuredEventTask
  if (res.locals.featuredEvent) {
    // Find live event and its latest announcement
    featuredEventTask = res.locals.featuredEvent.load(['entries', 'entries.userRoles'])
      .then(async function () {
        context.featuredEventAnnouncement = await postService.findLatestAnnouncement({ eventId: res.locals.featuredEvent.get('id') })
        context.homeAnnouncement = context.featuredEventAnnouncement
      })
  }

  // Find previous event
  let previousEventTask = await eventService.findEventByStatus('closed')
    .then(function (previousEvent) {
      context.previousEvent = previousEvent
    })

  // Gather any entries
  let latestEntriesTask = eventService.findLatestEntries()
    .then(function (latestEntries) {
      context.latestEntries = latestEntries.models
    })

  // Gather any user posts
  let postsTask = postService.findPosts({specialPostType: null})
    .then(async function (postsCollection) {
      await postsCollection.load(['entry', 'event', 'entry.userRoles'])
      context.posts = postsCollection.models
      context.pageCount = await postService.findPosts({
        specialPostType: null,
        pageCount: true
      })
    })

  await Promise.all([featuredEventTask, previousEventTask, latestEntriesTask, postsTask]) // Parallelize fetching everything

  res.render('index', context)
}

/**
 * Events listing
 */
async function events (req, res) {
  let [pendingCollection, openCollection, closedCollection] = await Promise.all([
    await eventService.findEvents({status: 'pending', sortDatesAscending: true}),
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
 * People listing
 */
async function people (req, res) {
  let usersCollection = await userService.findAll()
  res.render('people', {
    users: usersCollection.sortBy((user) => -user.get('id'))
  })
}

/**
 * IRC Chat
 */
async function chat (req, res) {
  res.render('chat')
}
