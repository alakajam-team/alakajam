'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const promisify = require('promisify-node')
const fs = promisify('fs')
const path = promisify('path')
const log = require('../core/log')
const forms = require('../core/forms')
const cache = require('../core/cache')
const constants = require('../core/constants')
const eventService = require('../services/event-service')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const settingService = require('../services/setting-service')
const notificationService = require('../services/notification-service')
const platformService = require('../services/platform-service')

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
        return postService.findCommentById(req.query.editComment).then(async function (comment) {
          if (securityService.canUserWrite(user, comment, { allowMods: true }) ||
              await postService.isOwnAnonymousComment(comment, user)) {
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
  let context = cache.general.get('home_page')

  if (!context) {
    context = {}

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

    // Gather featured entries
    let suggestedEntriesTask = null
    if (res.locals.featuredEvent && res.locals.featuredEvent.get('status_results') === 'voting') {
      suggestedEntriesTask = eventService.findGames({
        eventId: res.locals.featuredEvent.get('id'),
        sortByScore: true,
        pageSize: 4
      }).then(function (suggestedEntriesCollection) {
        context.suggestedEntries = suggestedEntriesCollection.models
      })
    }

    // Gather any user posts
    let postsTask = postService.findPosts({specialPostType: null})
      .then(async function (postsCollection) {
        await postsCollection.load(['entry', 'event', 'entry.userRoles'])
        context.posts = postsCollection.models
        context.pageCount = postsCollection.pagination.pageCount
      })

    // Find featured post
    let featuredPostTask = settingService.find(constants.SETTING_FEATURED_POST_ID)
      .then(async function (featuredPostId) {
        if (featuredPostId) {
          context.featuredPost = await postService.findPostById(featuredPostId)
        }
      })

    // Find featured links data
    let featuredLinksTask = settingService.find(constants.SETTING_FEATURED_LINKS)
      .then(function (featuredLinks) {
        if (featuredLinks) {
          let data = JSON.parse(featuredLinks)
          context.featuredLinks = data.featured
        }
      })

    await Promise.all([featuredEventTask, previousEventTask, suggestedEntriesTask,
      postsTask, featuredPostTask, featuredLinksTask]) // Parallelize fetching everything

    cache.general.set('home_page', context, 10 /* 10 seconds */)
  }

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
  for (let event of allEventsCollection.models) {
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
  }

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
  res.locals.pageTitle = 'Games'

  const PAGE_SIZE = 20

  // Parse query
  let currentPage = 1
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p)
  }
  let searchOptions = {
    pageSize: PAGE_SIZE,
    page: currentPage
  }
  // TODO Refactor (shared with eventController
  searchOptions.search = forms.sanitizeString(req.query.search)
  if (req.query.divisions) {
    if (typeof req.query.divisions === 'object') {
      searchOptions.divisions = req.query.divisions
    } else {
      searchOptions.divisions = [req.query.divisions]
    }
  }
  if (req.query.platforms) {
    if (typeof req.query.platforms === 'object') {
      searchOptions.platforms = req.query.platforms.map(str => parseInt(str))
    } else {
      searchOptions.platforms = [parseInt(req.query.platforms)]
    }
    if (searchOptions.platforms.includes(NaN)) {
      searchOptions.platforms = []
      log.error('Invalid platform query: ' + req.query.platforms)
    }
  }
  if (req.query.eventId === 'none') {
    searchOptions.eventId = null
  } else {
    searchOptions.eventId = forms.isId(req.query.eventId) ? req.query.eventId : undefined
  }

  // Fetch info
  // TODO Parallelize tasks
  let platformCollection = await platformService.fetchAll()
  let entriesCollection = await eventService.findGames(searchOptions)

  let eventsCollection = await eventService.findEvents()
  let searchedEvent = null
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.findWhere({'id': parseInt(searchOptions.eventId)})
  }

  res.render('games', {
    searchOptions,
    searchedEvent,
    currentPage,
    entryCount: entriesCollection.pagination.rowCount,
    pageCount: entriesCollection.pagination.pageCount,
    entries: entriesCollection.models,
    events: eventsCollection.models,
    platforms: platformCollection.models
  })
}

/**
 * People listing
 */
async function people (req, res) {
  res.locals.pageTitle = 'People'

  const PAGE_SIZE = 30

  // Parse query
  let currentPage = 1
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p)
  }
  let searchOptions = {
    pageSize: PAGE_SIZE,
    page: currentPage
  }
  searchOptions.search = forms.sanitizeString(req.query.search)
  if (req.query.eventId === 'none') {
    searchOptions.eventId = null
  } else {
    searchOptions.eventId = forms.isId(req.query.eventId) ? req.query.eventId : undefined
  }

  // Fetch info
  let usersCollection = await userService.findUsers(searchOptions)
  let eventsCollection = await eventService.findEvents()
  let searchedEvent = null
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.findWhere({'id': parseInt(searchOptions.eventId)})
  }

  res.render('people', {
    searchOptions,
    searchedEvent,
    users: usersCollection.sortBy((user) => -user.get('id')),
    userCount: usersCollection.pagination.rowCount,
    pageCount: usersCollection.pagination.pageCount,
    currentPage,
    events: eventsCollection.models
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
  res.locals.pageTitle = 'Site changes'

  res.locals.changes = (await fs.readFile(path.join(__dirname, '../CHANGES.md'))).toString()

  res.render('changes', {
    sidebar: await settingService.findArticlesSidebar()
  })
}
