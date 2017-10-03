'use strict'

/**
 * Event pages
 *
 * @module controllers/event-controller
 */

const constants = require('../core/constants')
const enums = require('../core/enums')
const forms = require('../core/forms')
const cache = require('../core/cache')
const log = require('../core/log')
const templating = require('../controllers/templating')
const userService = require('../services/user-service')
const eventService = require('../services/event-service')
const eventThemeService = require('../services/event-theme-service')
const eventRatingService = require('../services/event-rating-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const settingService = require('../services/setting-service')
const platformService = require('../services/platform-service')

module.exports = {
  handleEventUserShortcuts,

  eventMiddleware,

  viewDefaultPage,
  viewEventAnnouncements,
  viewEventPosts,
  viewEventThemes,
  viewEventGames,
  viewEventRatings,
  viewEventResults,

  editEvent,
  editEventThemes,
  editEventEntries,
  deleteEvent,

  ajaxFindThemes,
  ajaxSaveVote
}

/**
 * Fetches the event & optionally the user's entry
 */
async function eventMiddleware (req, res, next) {
  if (req.params.eventName !== 'create-event' && req.baseUrl.indexOf('/external-entry') !== 0) {
    let event = await eventService.findEventByName(req.params.eventName)
    res.locals.event = event
    if (!event) {
      res.errorPage(404, 'Event not found')
      return
    } else {
      if (!res.locals.pageTitle) {
        res.locals.pageTitle = event.get('title')
        res.locals.pageDescription = 'An Alakajam! event. Dates: ' + event.get('display_dates') + '.'
        if (event.get('display_theme')) {
          res.locals.pageDescription += ' Theme: ' + event.get('display_theme')
        }
      }

      let announcementTask = postService.findLatestAnnouncement({ eventId: event.id })
          .then((announcement) => { res.locals.latestEventAnnouncement = announcement })
      let userShortcutTasks = handleEventUserShortcuts(res, res.locals.event)

      await Promise.all([announcementTask, userShortcutTasks])
    }
  }
  next()
}

async function handleEventUserShortcuts (res, targetEvent) {
  if (targetEvent && res.locals.user) {
    let entryTask = true
    let userPostTask = true

    entryTask = eventService.findUserEntryForEvent(res.locals.user, targetEvent.get('id'))
        .then(userEntry => { res.locals.userEntry = userEntry })
    userPostTask = postService.findPost({
      userId: res.locals.user.id,
      eventId: targetEvent.id,
      specialPostType: null
    }).then(userPost => { res.locals.userPost = userPost })

    return Promise.all([entryTask, userPostTask])
  }
}

/**
 * Root event page, redirects to its entries
 */
async function viewDefaultPage (req, res) {
  if (res.locals.event.get('status_entry') !== enums.EVENT.STATUS_ENTRY.OFF) {
    res.redirect(templating.buildUrl(res.locals.event, 'event', 'games'))
  } else {
    res.redirect(templating.buildUrl(res.locals.event, 'event', 'posts'))
  }
}

/**
 * Browse event announcements
 */
async function viewEventAnnouncements (req, res) {
  res.locals.pageTitle += ' | Announcements'

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
  res.locals.pageTitle += ' | Posts'

  let postsCollection = await postService.findPosts({
    eventId: res.locals.event.get('id')
  })
  await postsCollection.load(['entry', 'event'])

  res.render('event/view-event-posts', {
    posts: postsCollection.models,
    pageCount: postsCollection.pagination.pageCount
  })
}

/**
 * Browse event theme voting
 */
async function viewEventThemes (req, res) {
  res.locals.pageTitle += ' | Themes'

  let event = res.locals.event

  let statusThemes = event.get('status_theme')
  if ([enums.EVENT.STATUS_THEME.DISABLED, enums.EVENT.STATUS_THEME.OFF].includes(statusThemes)) {
    res.errorPage(404)
  } else {
    let context = {
      maxThemeSuggestions: parseInt(await settingService.find(constants.SETTING_EVENT_THEME_SUGGESTIONS, '3')),
      infoMessage: null
    }

    if (forms.isId(statusThemes)) {
      context.themesPost = await postService.findPostById(statusThemes)
    } else {
      if (req.method === 'POST' && res.locals.user) {
        let {fields} = await req.parseForm()

        if (fields.action === 'ideas') {
          // Gather ideas data
          let ideas = []
          for (let i = 0; i < parseInt(fields['idea-rows']); i++) {
            let idField = fields['idea-id[' + i + ']']
            if (forms.isId(idField) || !idField) {
              ideas.push({
                id: idField,
                title: forms.sanitizeString(fields['idea-title[' + i + ']'])
              })
            }
          }
          // Update theme ideas
          await eventThemeService.saveThemeIdeas(res.locals.user, event, ideas)
        } else if (fields.action === 'vote') {
          if (forms.isId(fields['theme-id']) && (fields['upvote'] !== undefined || fields['downvote'] !== undefined)) {
            let score = (fields['upvote'] !== undefined) ? 1 : -1
            await eventThemeService.saveVote(res.locals.user, event, parseInt(fields['theme-id']), score)
          }
        } else if (fields.action === 'shortlist' && fields['shortlist-votes']) {
          let ids = fields['shortlist-votes'].split(',').map(id => parseInt(id))
          let validIds = true
          for (let id of ids) {
            if (!forms.isId(id)) {
              validIds = false
            }
          }
          if (validIds) {
            await eventThemeService.saveShortlistVotes(res.locals.user, event, ids)
            context.infoMessage = 'Ranking changes saved.'
          }
        }
      }

      // Gather info for display
      if (res.locals.user) {
        let userThemesCollection = await eventThemeService.findThemeIdeasByUser(res.locals.user, event)
        context.userThemes = userThemesCollection.models

        context.voteCount = await eventThemeService.findThemeVotesHistory(
          res.locals.user, event, { count: true })

        if (event.get('status_theme') === enums.EVENT.STATUS_THEME.VOTING) {
          if (await eventThemeService.isThemeVotingAllowed(event)) {
            let votesHistoryCollection = await eventThemeService.findThemeVotesHistory(res.locals.user, event)
            context.votesHistory = votesHistoryCollection.models
            context.votingAllowed = true
          } else {
            context.ideasRequired = await settingService.find(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, '10')
            context.votingAllowed = false
          }
        } else if (event.get('status_theme') === enums.EVENT.STATUS_THEME.SHORTLIST) {
          let shortlistCollection = await eventThemeService.findShortlist(event)
          let shortlistVotesCollection = await eventThemeService.findThemeShortlistVotes(res.locals.user, event)

          if (shortlistVotesCollection.length === shortlistCollection.length) {
            let scoreByTheme = {}
            shortlistVotesCollection.each(function (vote) {
              scoreByTheme[vote.get('theme_id')] = vote.get('score')
            })
            context.shortlist = shortlistCollection.sortBy(theme => -scoreByTheme[theme.get('id')] || 0)
            context.randomizedShortlist = false
          } else {
            context.shortlist = shortlistCollection.shuffle()
            context.randomizedShortlist = true
          }
        }
      } else {
        if (event.get('status_theme') === enums.EVENT.STATUS_THEME.VOTING) {
          if (await eventThemeService.isThemeVotingAllowed(event)) {
            let sampleThemesCollection = await eventThemeService.findThemesToVoteOn(null, event)
            context.sampleThemes = sampleThemesCollection.models
            context.votingAllowed = true
          } else {
            context.ideasRequired = parseInt(await settingService.find(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, '10'))
            context.votingAllowed = false
          }
        } else if (event.get('status_theme') === enums.EVENT.STATUS_THEME.SHORTLIST) {
          let shortlistCollection = await eventThemeService.findShortlist(event)
          context.shortlist = shortlistCollection.shuffle()
          context.randomizedShortlist = true
        }
      }

      // State-specific data
      let statusTheme = event.get('status_theme')
      if ([enums.EVENT.STATUS_THEME.SHORTLIST, enums.EVENT.STATUS_THEME.RESULTS].includes(statusTheme)) {
        context.shortlistVotes = await eventThemeService.countShortlistVotes(event)
      }
      if (statusTheme === enums.EVENT.STATUS_THEME.RESULTS) {
        let shortlistCollection = await eventThemeService.findShortlist(event)
        if (shortlistCollection.length === 0) {
          // In case the shortlist phase has been skipped
          shortlistCollection = await eventThemeService.findBestThemes(event)
        }
        context.shortlist = shortlistCollection.sortBy(theme => -theme.get('score'))

        if (res.locals.user) {
          let shortlistVotesCollection = await eventThemeService.findThemeShortlistVotes(res.locals.user, event)
          if (shortlistVotesCollection.length === shortlistCollection.length) {
            context.userRanks = {}
            shortlistVotesCollection.each(function (vote) {
              context.userRanks[vote.get('theme_id')] = 11 - parseInt(vote.get('score'))
            })
          }
        }
      }

      await event.load('details')
    }

    res.render('event/view-event-themes', context)
  }
}

/**
 * Browse event games
 */
async function viewEventGames (req, res) {
  res.locals.pageTitle += ' | Games'

  const PAGE_SIZE = 20

  let {user, event} = res.locals
  if (event.get('status_entry') === enums.EVENT.STATUS_ENTRY.OFF) {
    res.errorPage(404)
    return
  }

  // Search form & pagination
  let currentPage = 1
  if (forms.isId(req.query.p)) {
    currentPage = parseInt(req.query.p)
  }
  let searchOptions = {
    pageSize: PAGE_SIZE,
    page: currentPage,
    eventId: event.get('id')
  }
  // TODO Refactor (shared with mainController)
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

  // Search entries
  let rescueEntries = []
  let canVoteInEvent = await eventRatingService.canVoteInEvent(user, event)
  if (canVoteInEvent && event.get('status_results') === 'voting_rescue') {
    rescueEntries = (await eventService.findRescueEntries(event)).models
  }
  let requiredVotes = parseInt(await settingService.find(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, '10'))
  let entriesCollection = await eventService.findGames(searchOptions)
  let platformCollection = await platformService.fetchAll()

  // Fetch vote history
  let voteHistory = []
  if (user && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE,
    enums.EVENT.STATUS_RESULTS.RESULTS].includes(event.get('status_results'))) {
    let voteHistoryCollection = await eventRatingService.findVoteHistory(user.get('id'), event, { pageSize: 5 })
    voteHistory = voteHistoryCollection.models
  }

  res.render('event/view-event-games', {
    rescueEntries,
    requiredVotes,
    entriesCollection,
    voteHistory,
    searchOptions,
    currentPage,
    platforms: platformCollection.models
  })
}

/**
 * Browse ratings by own user
 */
async function viewEventRatings (req, res) {
  res.locals.pageTitle += ' | Ratings'

  if (res.locals.user &&
    [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE,
      enums.EVENT.STATUS_RESULTS.RESULTS].includes(res.locals.event.get('status_results'))) {
    let voteHistoryCollection = await eventRatingService.findVoteHistory(res.locals.user.get('id'), res.locals.event,
      { withRelated: ['entry.details', 'entry.userRoles'] })
    let categoryTitles = res.locals.event.related('details').get('category_titles')

    let rankedVoteHistories = []
    for (let i in categoryTitles) {
      let categoryIndex = parseInt(i) + 1
      let voteFilter = function (division) {
        return function (vote, vote2) {
          return vote.get('vote_' + categoryIndex) > 0 && vote.related('entry').get('division') === division
        }
      }
      let voteSorter = function (vote, vote2) {
        return vote2.get('vote_' + categoryIndex) - vote.get('vote_' + categoryIndex)
      }

      let validVotesSolo = voteHistoryCollection.filter(voteFilter('solo'))
      let validVotesTeam = voteHistoryCollection.filter(voteFilter('team'))
      validVotesSolo.sort(voteSorter)
      validVotesTeam.sort(voteSorter)

      rankedVoteHistories.push({
        title: categoryTitles[i],
        votesSolo: validVotesSolo,
        votesTeam: validVotesTeam
      })
    }

    res.render('event/view-event-ratings', {
      rankedVoteHistories,
      ratingCount: voteHistoryCollection.length
    })
  } else {
    res.errorPage(404)
  }
}

/**
 * Browse event results
 */
async function viewEventResults (req, res) {
  res.locals.pageTitle += ' | Results'

  // Permission checks & special post case
  let statusResults = res.locals.event.get('status_results')
  if (forms.isId(statusResults)) {
    res.locals.resultsPost = await postService.findPostById(statusResults)
  } else if (statusResults !== enums.EVENT.STATUS_RESULTS.RESULTS) {
    res.errorPage(404)
    return
  }

  // Parse query
  let sortedBy = 1
  let division = enums.DIVISION.SOLO
  if (forms.isInt(req.query.sortBy) && req.query.sortBy > 0 && req.query.sortBy <= constants.MAX_CATEGORY_COUNT) {
    sortedBy = parseInt(req.query.sortBy)
  }
  if ([enums.DIVISION.SOLO, enums.DIVISION.TEAM].includes(req.query.division)) {
    division = req.query.division
  }

  // Gather entries rankings
  let cacheKey = 'results_' + division + '_' + sortedBy
  let context = await cache.getOrFetch(cache.general, cacheKey, async function () {
    let rankingsCollection = await eventRatingService.findEntryRankings(res.locals.event, division, sortedBy)
    return {
      rankings: rankingsCollection.models,
      sortedBy,
      division
    }
  })

  res.render('event/view-event-results', context)
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
  let infoMessage = ''
  let redirected = false

  if (fields && fields.name && fields.title) {
    let event = res.locals.event
    let creation = !event

    // TODO Typed fields should not be reset if validation fails
    if (!forms.isSlug(fields.name)) {
      errorMessage = 'Name is not a valid slug'
    } else if (fields.name.indexOf('-') === -1) {
      errorMessage = 'Name must contain at least one hyphen (-)'
    } else if (!forms.isIn(fields.status, enums.EVENT.STATUS)) {
      errorMessage = 'Invalid status'
    } else if (!forms.isIn(fields['status-rules'], enums.EVENT.STATUS_RULES) &&
        !forms.isId(fields['status-rules'])) {
      errorMessage = 'Invalid welcome/rules post status'
    } else if (!forms.isIn(fields['status-theme'], enums.EVENT.STATUS_THEME) &&
        !forms.isId(fields['status-theme'])) {
      errorMessage = 'Invalid theme status'
    } else if (!forms.isIn(fields['status-entry'], enums.EVENT.STATUS_ENTRY)) {
      errorMessage = 'Invalid entry status'
    } else if (!forms.isIn(fields['status-results'], enums.EVENT.STATUS_RESULTS) &&
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
      try {
        fields['category-titles'] = JSON.parse(fields['category-titles'] || '[]')
        if (fields['category-titles'].length > constants.MAX_CATEGORY_COUNT) {
          errorMessage = 'Events cannot have more than ' + constants.MAX_CATEGORY_COUNT + ' rating categories'
        }
      } catch (e) {
        errorMessage = 'Invalid rating category JSON'
      }
    }

    if (!errorMessage) {
      if (creation) {
        event = eventService.createEvent()
      }

      let previousName = event.get('name')
      event.set({
        title: forms.sanitizeString(fields.title),
        name: fields.name,
        display_dates: forms.sanitizeString(fields['display-dates']),
        display_theme: forms.sanitizeString(fields['display-theme']),
        status: fields.status,
        status_rules: fields['status-rules'],
        status_theme: fields['status-theme'],
        status_entry: fields['status-entry'],
        status_results: fields['status-results'],
        countdown_config: {
          message: forms.sanitizeString(fields['countdown-message']),
          link: forms.sanitizeString(fields['countdown-link']),
          date: forms.parseDateTime(fields['countdown-date']),
          phrase: forms.sanitizeString(fields['countdown-phrase']),
          enabled: fields['countdown-enabled'] === 'on'
        }
      })

      // Triggers
      if (event.hasChanged('status_theme') && event.get('status_theme') === enums.EVENT.STATUS_THEME.SHORTLIST) {
        await eventThemeService.computeShortlist(event)
        infoMessage = 'Theme shortlist computed. '
      }

      let nameChanged = event.hasChanged('name')
      event = await event.save()
      cache.eventsById.del(event.get('id'))
      cache.eventsByName.del(event.get('name'))
      if (nameChanged && previousName) {
        await eventService.refreshEventReferences(event)
        cache.eventsByName.del(previousName)
      }

      let eventDetails = event.related('details')
      eventDetails.set({
        category_titles: fields['category-titles']
      })
      await eventDetails.save()

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
 * Manage the event's submitted themes
 */
async function editEventThemes (req, res) {
  if (!securityService.isAdmin(res.locals.user)) {
    res.errorPage(403)
    return
  }

  if (forms.isId(req.query.ban)) {
    let theme = await eventThemeService.findThemeById(req.query.ban)
    if (theme) {
      theme.set('status', enums.THEME.STATUS.BANNED)
      await theme.save()
    }
  } else if (forms.isId(req.query.unban)) {
    let theme = await eventThemeService.findThemeById(req.query.unban)
    if (theme) {
      theme.set('status', (res.locals.event.get('status_theme') === enums.EVENT.STATUS_THEME.VOTING)
        ? enums.THEME.STATUS.ACTIVE : enums.THEME.STATUS.OUT)
      await theme.save()
    }
  }

  let themesCollection = await eventThemeService.findAllThemes(res.locals.event)
  let shortlistCollection = await eventThemeService.findShortlist(res.locals.event)

  res.render('event/edit-event-themes', {
    themes: themesCollection.models,
    eliminationMinNotes: parseInt(await settingService.find(constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, '5')),
    shortlist: shortlistCollection.models
  })
}

/**
 * Browse event entries
 */
async function editEventEntries (req, res) {
  res.locals.pageTitle += ' | Entries'

  let event = res.locals.event

  // Find all entries
  let findGameOptions = {
    eventId: event.get('id'),
    pageSize: null,
    withRelated: ['userRoles', 'details']
  }
  if (req.query.orderBy === 'ratingCount') {
    findGameOptions.sortByRatingCount = true
  }
  let entriesCollection = await eventService.findGames(findGameOptions)

  // Gather info for feedback details
  let entriesById = {}
  entriesCollection.each(function (entry) {
    entriesById[entry.get('id')] = entry
  })
  let detailedEntryInfo = {}
  let usersById = {}
  if (forms.isId(req.query.entryDetails) && entriesById[req.query.entryDetails]) {
    let eventUsersCollection = await userService.findUsers({ eventId: event.get('id') })
    eventUsersCollection.each(function (user) {
      usersById[user.get('id')] = user
    })

    let entry = entriesById[req.query.entryDetails]
    await entry.load(['comments', 'votes'])
    detailedEntryInfo.id = req.query.entryDetails
    detailedEntryInfo.given = await eventRatingService.computeScoreGivenByUserAndEntry(entry, event)
    detailedEntryInfo.received = await eventRatingService.computeScoreReceivedByUser(entry, event)
    detailedEntryInfo.total = eventRatingService.computeFeedbackScore(detailedEntryInfo.received.total, detailedEntryInfo.given.total)
  }

  res.render('event/edit-event-entries', {
    entries: entriesCollection.models,
    entriesById,
    usersById,
    detailedEntryInfo
  })
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

/**
 * AJAX API: Find themes to vote on
 */
async function ajaxFindThemes (req, res) {
  let themesCollection = await eventThemeService.findThemesToVoteOn(res.locals.user, res.locals.event)
  let json = []
  for (let theme of themesCollection.models) {
    json.push({
      id: theme.get('id'),
      title: theme.get('title')
    })
  }
  res.end(JSON.stringify(json))
}

/**
 * AJAX API: Save a vote
 */
async function ajaxSaveVote (req, res) {
  let {fields} = await req.parseForm()
  if (forms.isId(fields['id']) && (fields['upvote'] !== undefined || fields['downvote'] !== undefined)) {
    let score = (fields['upvote'] !== undefined) ? 1 : -1
    await eventThemeService.saveVote(res.locals.user, res.locals.event, parseInt(fields['id']), score)
  }
  res.end('')
}
