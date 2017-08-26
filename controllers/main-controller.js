'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const promisify = require('promisify-node')
const fs = promisify('fs')
const path = promisify('path')
const forms = require('../core/forms')
const constants = require('../core/constants')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const settingService = require('../services/setting-service')
const cache = require('../core/cache')

module.exports = {
  anyPageMiddleware,

  index,
  events,
  people,
  chat,
  changes
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

  // Update unread notifications, from cache if possible
  if (res.locals.user && res.locals.path !== '/dashboard/feed') {
    let userCache = cache.user(res.locals.user)
    res.locals.unreadNotifications = userCache.get('unreadNotifications')
    if (!res.locals.unreadNotifications) {
      let commentsCollection = await postService.findCommentsToUser(res.locals.user, { notificationsLastRead: true })
      res.locals.unreadNotifications = commentsCollection.length
      userCache.set('unreadNotifications', res.locals.unreadNotifications)
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

  // Find featured post
  let featuredPostTask = settingService.find(constants.SETTING_FEATURED_POST_ID)
    .then(async function (featuredPostId) {
      if (featuredPostId) {
        context.featuredPost = await postService.findPostById(featuredPostId)
      }
    })

  await Promise.all([featuredEventTask, previousEventTask, latestEntriesTask, postsTask, featuredPostTask]) // Parallelize fetching everything

  res.render('index', context)
}

/**
 * Events listing
 */
async function events (req, res) {
  res.locals.pageTitle = 'Events'

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
  res.locals.pageTitle = 'People'

  let usersCollection = await userService.findAll()
  res.render('people', {
    users: usersCollection.sortBy((user) => -user.get('id'))
  })
}

/**
 * IRC Chat
 */
async function chat (req, res) {
  res.locals.pageTitle = 'Chat'

  res.render('chat')
}

/**
 * Changelog
 */
async function changes (req, res) {
  res.locals.changes = (await fs.readFile(path.join(__dirname, '../CHANGES.md'))).toString()

  res.render('changes')
}
