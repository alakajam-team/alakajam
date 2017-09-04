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
const notificationService = require('../services/notification-service')

module.exports = {
  anyPageMiddleware,

  index,
  events,
  games,
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
    res.locals.unreadNotifications = await notificationService.countUnreadNotifications(res.locals.user)
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

  let pending = []
  let open = []
  let closed = []

  let allEventsCollection = await eventService.findEvents()

  // Group entries by status, and compute their entry counts
  let entryCounts = {}
  allEventsCollection.each(async function (event) {
    entryCounts[event.get('id')] = await eventService.countEntriesByEvent(event)
    switch (event.get('status')) {
      case 'pending':
        pending.unshift(event) // sort by ascending dates
        break
      case 'open':
        open.push(event)
        break
      default:
        closed.push(event)
    }
  })

  res.render('events', {
    pending,
    open,
    closed,
    entryCounts
  })
}

/**
 * Game browser
 */
async function games (req, res) {
  res.locals.pageTitle = 'People'

  let searchOptions = {}
  searchOptions.eventId = forms.isId(req.query.eventId) ? req.query.eventId : undefined
  searchOptions.search = forms.sanitizeString(req.query.search)
  if (req.query.platforms) {
    if (typeof req.query.platforms === 'object') {
      searchOptions.platforms = req.query.platforms.map(str => forms.sanitizeString(str))
    } else {
      searchOptions.platforms = [forms.sanitizeString(req.query.platforms)]
    }
  }

  let entriesCollection = await eventService.findGames(searchOptions)
  let eventsCollection = await eventService.findEvents()
  let searchedEvent = null
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.findWhere({'id': parseInt(searchOptions.eventId)})
  }

  res.render('games', {
    entries: entriesCollection.models,
    events: eventsCollection.models,
    searchOptions,
    searchedEvent
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
