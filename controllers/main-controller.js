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
const cache = require('../core/cache')
const constants = require('../core/constants')
const enums = require('../core/enums')
const eventService = require('../services/event-service')
const eventRatingService = require('../services/event-rating-service')
const userService = require('../services/user-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const settingService = require('../services/setting-service')
const notificationService = require('../services/notification-service')
const platformService = require('../services/platform-service')
const likeService = require('../services/like-service')
const eventController = require('./event-controller')

module.exports = {
  anyPageMiddleware,

  index,
  events,
  games,
  people,
  peopleMods,
  chat,
  changes
}

async function anyPageMiddleware (req, res, next) {
  res.locals.path = req.originalUrl

  // Fetch current user
  let userTask = null
  if (req.session.userId) {
    userTask = userService.findById(req.session.userId).then(function (user) {
      res.locals.user = user

      // Fetch comment to edit
      if (req.query.editComment && forms.isId(req.query.editComment)) {
        return postService.findCommentById(req.query.editComment).then(async function (comment) {
          if (comment && (securityService.canUserWrite(user, comment, { allowMods: true }) ||
              await postService.isOwnAnonymousComment(comment, user))) {
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
      featuredEventTask = postService.findLatestAnnouncement({ eventId: res.locals.featuredEvent.get('id') })
        .then(async function (announcement) {
          context.featuredEventAnnouncement = announcement
          if (res.locals.featuredEvent.get('status_entry') !== enums.EVENT.STATUS_ENTRY.OFF) {
            res.locals.featuredEventCount = await eventService.countEntriesByEvent(res.locals.featuredEvent)
          }
        })
    }

    // Fetch event schedule (preferably without displaying too many events after the featured one)
    if (res.locals.featuredEvent) {
      let featuredEventIndex
      let fetchedEventsCollection
      let eventSchedule = []
      let page = 0
      do {
        fetchedEventsCollection = await eventService.findEvents({ pageSize: 5, page: page++ })
        eventSchedule = eventSchedule.concat(fetchedEventsCollection.models)
        featuredEventIndex = eventSchedule.findIndex(event => event.get('id') === res.locals.featuredEvent.get('id'))
      } while (featuredEventIndex === -1 && fetchedEventsCollection.length > 0)

      let startIndex = Math.max(0, featuredEventIndex - 2)
      context.eventSchedule = eventSchedule.slice(startIndex, startIndex + 5)
    } else {
      let fetchedEventsCollection = await eventService.findEvents({ pageSize: 5 })
      context.eventSchedule = fetchedEventsCollection.models
    }

    // Gather featured entries
    let suggestedEntriesTask = null
    if (res.locals.featuredEvent &&
      [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE].includes(res.locals.featuredEvent.get('status_results'))) {
      suggestedEntriesTask = eventService.findGames({
        eventId: res.locals.featuredEvent.get('id'),
        pageSize: 4,
        notReviewedById: res.locals.user ? res.locals.user.get('id') : undefined
      }).then(function (suggestedEntriesCollection) {
        context.suggestedEntries = suggestedEntriesCollection.models
      })
    }

    // Gather any user posts
    let postsTask = postService.findPosts({ specialPostType: null })
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

    await Promise.all([featuredEventTask, suggestedEntriesTask, postsTask, featuredPostTask]) // Parallelize fetching everything

    cache.general.set('home_page', context, 10 /* 10 seconds */)
  }

  await eventController.handleEventUserShortcuts(res, res.locals.featuredEvent)

  if (res.locals.user) {
    let allPagePosts = [context.featuredEventAnnouncement, context.featuredPost].concat(context.posts)
    res.locals.userLikes = await likeService.findUserLikeInfo(allPagePosts, res.locals.user)
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
  let closedAlakajam = []
  let closedOther = []

  let allEventsCollection = await eventService.findEvents()

  // Group entries by status, gather featured entries
  let featuredEntries = {}
  for (let event of allEventsCollection.models) {
    switch (event.get('status')) {
      case enums.EVENT.STATUS.PENDING:
        pending.unshift(event) // sort by ascending dates
        break
      case enums.EVENT.STATUS.OPEN:
        open.push(event)
        break
      default:
        if (event.get('status_theme') !== enums.EVENT.STATUS_THEME.DISABLED) {
          closedAlakajam.push(event)
        } else {
          closedOther.push(event)
        }

        if (event.get('status_results') === enums.EVENT.STATUS_RESULTS.RESULTS) {
          let topEntries = await eventService.findGames({
            eventId: event.get('id'),
            sortByRanking: true,
            pageSize: 6,
            withRelated: ['details', 'userRoles']
          })
          let topEntriesByDivision = {}
          topEntries.forEach(function (entry) {
            let division = entry.get('division')
            if (!topEntriesByDivision[division]) {
              topEntriesByDivision[division] = []
            }
            if (topEntriesByDivision[division].length < 3 && entry.related('details').get('ranking_1')) {
              topEntriesByDivision[division].push(entry)
            }
          })
          featuredEntries[event.get('id')] = topEntriesByDivision
        }
    }
  }

  res.render('events', {
    pending,
    open,
    closedAlakajam,
    closedOther,
    featuredEntries
  })
}

/**
 * Game browser
 */
async function games (req, res) {
  res.locals.pageTitle = 'Games'

  let {user, featuredEvent} = res.locals

  // Parse query
  let searchOptions = await eventController.handleGameSearch(req, res)

  // Fetch info
  // TODO Parallelize tasks
  let rescueEntries = []
  let requiredVotes = null
  if (featuredEvent) {
    let canVoteInEvent = await eventRatingService.canVoteInEvent(user, featuredEvent)
    if (canVoteInEvent && featuredEvent.get('status_results') === 'voting_rescue') {
      rescueEntries = (await eventService.findRescueEntries(featuredEvent, user)).models
      requiredVotes = parseInt(await settingService.find(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, '10'))
    }
  }
  let entriesCollection = await eventService.findGames(searchOptions)
  let platformCollection = await platformService.fetchAll()

  let eventsCollection = await eventService.findEvents()
  let searchedEvent = null
  if (searchOptions.eventId) {
    searchedEvent = eventsCollection.findWhere({'id': parseInt(searchOptions.eventId)})
  }

  res.render('games', {
    searchOptions,
    searchedEvent,
    entriesCollection,
    rescueEntries,
    requiredVotes,
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
  let eventsCollection = await eventService.findEvents({ statusNot: enums.EVENT.STATUS.PENDING })
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

async function peopleMods (req, res) {
  res.locals.pageTitle = 'Admins & mods'

  let adminsCollection = await userService.findUsers({ isAdmin: true, orderBy: 'title' })
  let modsCollection = await userService.findUsers({ isMod: true, orderBy: 'title' })
  modsCollection.remove(adminsCollection.models)

  res.render('people-mods', {
    mods: modsCollection.models,
    admins: adminsCollection.models
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
