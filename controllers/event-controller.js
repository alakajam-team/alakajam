'use strict'

/**
 * Event pages
 *
 * @module controllers/event-controller
 */

const constants = require('../core/constants')
const forms = require('../core/forms')
const cache = require('../core/cache')
const templating = require('../controllers/templating')
const eventService = require('../services/event-service')
const eventThemeService = require('../services/event-theme-service')
const eventRatingService = require('../services/event-rating-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const settingService = require('../services/setting-service')

module.exports = {
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

      let entryTask = true
      let userPostTask = true
      if (res.locals.user) {
        entryTask = eventService.findUserEntryForEvent(res.locals.user, event.get('id'))
            .then(userEntry => { res.locals.userEntry = userEntry })
        userPostTask = postService.findPost({
          userId: res.locals.user.id,
          eventId: res.locals.event.id,
          specialPostType: null
        }).then(userPost => { res.locals.userPost = userPost })
      }
      await Promise.all([announcementTask, entryTask, userPostTask])
    }
  }
  next()
}

/**
 * Root event page, redirects to its entries
 */
async function viewDefaultPage (req, res) {
  if (res.locals.event.get('status_entry') !== 'off') {
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
    pageCount: await postService.findPosts({
      eventId: res.locals.event.get('id'),
      specialPostType: null,
      pageCount: true
    })
  })
}

/**
 * Browse event theme voting
 */
async function viewEventThemes (req, res) {
  res.locals.pageTitle += ' | Themes'

  let event = res.locals.event

  let statusThemes = event.get('status_theme')
  if (statusThemes === 'disabled' || statusThemes === 'off') {
    res.errorPage(404)
  } else {
    let context = {}

    if (forms.isId(statusThemes)) {
      context.themesPost = await postService.findPostById(statusThemes)
    } else {
      if (req.method === 'POST' && res.locals.user) {
        let {fields} = await req.parseForm()

        if (fields.action === 'ideas') {
          // Gather ideas data
          let ideas = []
          for (let i = 0; i < 3; i++) {
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
          }
        }
      }

      // Gather info for display
      if (res.locals.user) {
        let userThemesCollection = await eventThemeService.findThemeIdeasByUser(res.locals.user, event)
        context.userThemes = userThemesCollection.models

        context.voteCount = await eventThemeService.findThemeVotesHistory(
          res.locals.user, event, { count: true })

        if (event.get('status_theme') === 'voting') {
          if (await eventThemeService.isThemeVotingAllowed(event)) {
            let votesHistoryCollection = await eventThemeService.findThemeVotesHistory(res.locals.user, event)
            context.votesHistory = votesHistoryCollection.models
            context.votingAllowed = true
          } else {
            context.ideasRequired = await settingService.find(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, '10')
            context.votingAllowed = false
          }
        } else if (event.get('status_theme') === 'shortlist') {
          let shortlistCollection = await eventThemeService.findShortlist(event)
          let shortlistVotesCollection = await eventThemeService.findThemeShortlistVotes(res.locals.user, event)

          if (shortlistVotesCollection.length === shortlistCollection.length) {
            let scoreByTheme = {}
            shortlistVotesCollection.each(function (vote) {
              scoreByTheme[vote.get('theme_id')] = vote.get('score')
            })
            context.shortlist = shortlistCollection.sortBy(theme => -scoreByTheme[theme.get('id')] || 0)
          } else {
            context.shortlist = shortlistCollection.shuffle()
          }
        }
      } else {
        if (event.get('status_theme') === 'voting') {
          if (await eventThemeService.isThemeVotingAllowed(event)) {
            let sampleThemesCollection = await eventThemeService.findThemesToVoteOn(null, event)
            context.sampleThemes = sampleThemesCollection.models
          } else {
            context.ideasRequired = await settingService.find(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, '10')
            context.votingAllowed = false
          }
        } else if (event.get('status_theme') === 'shortlist') {
          let shortlistCollection = await eventThemeService.findShortlist(event)
          context.shortlist = shortlistCollection.shuffle()
        }
      }

      if (event.get('status_theme') === 'results') {
        let shortlistCollection = await eventThemeService.findShortlist(event)
        if (shortlistCollection.length === 0) {
          // In case the shortlist phase has been skipped
          shortlistCollection = await eventThemeService.findBestThemes(event)
        }

        context.shortlist = shortlistCollection.sortBy(theme => -theme.get('score'))
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

  let event = res.locals.event
  if (event.get('status_entry') === 'off') {
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
    eventId: event.get('id'),
    sortByScore: true
  }
  searchOptions.search = forms.sanitizeString(req.query.search)
  if (req.query.platforms) {
    if (typeof req.query.platforms === 'object') {
      searchOptions.platforms = req.query.platforms.map(str => forms.sanitizeString(str))
    } else {
      searchOptions.platforms = [forms.sanitizeString(req.query.platforms)]
    }
  }

  // Search entries
  let entriesCollection = await eventService.findGames(searchOptions)
  searchOptions.count = true
  let entryCount = await eventService.findGames(searchOptions)

  // Fetch vote history
  let eventResultsStatus = event.get('status_results')
  let voteHistory = []
  if (res.locals.user && (eventResultsStatus === 'voting' || eventResultsStatus === 'results')) {
    let voteHistoryCollection = await eventRatingService.findVoteHistory(res.locals.user, event, { pageSize: 5 })
    voteHistory = voteHistoryCollection.models
  }

  res.render('event/view-event-games', {
    entries: entriesCollection.models,
    voteHistory,
    searchOptions,
    entryCount,
    currentPage,
    pageCount: Math.ceil(entryCount / PAGE_SIZE)
  })
}

/**
 * Browse ratings by own user
 */
async function viewEventRatings (req, res) {
  res.locals.pageTitle += ' | Ratings'

  let eventResultsStatus = res.locals.event.get('status_results')
  if (res.locals.user && (eventResultsStatus === 'voting' || eventResultsStatus === 'results')) {
    let voteHistoryCollection = await eventRatingService.findVoteHistory(res.locals.user, res.locals.event,
      { pageSize: null, withRelated: ['entry.details', 'entry.userRoles'] })
    let categoryTitles = res.locals.event.related('details').get('category_titles')

    let rankedVoteHistories = []
    for (let i in categoryTitles) {
      let categoryIndex = parseInt(i) + 1

      let validVotes = voteHistoryCollection.filter(function (vote) {
        return vote.get('vote_' + categoryIndex) > 0
      })
      validVotes.sort(function (vote, vote2) {
        return vote2.get('vote_' + categoryIndex) - vote.get('vote_' + categoryIndex)
      })

      rankedVoteHistories.push({
        title: categoryTitles[i],
        votes: validVotes
      })
    }

    res.render('event/view-event-ratings', {
      rankedVoteHistories
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

  let statusResults = res.locals.event.get('status_results')
  if (forms.isId(statusResults)) {
    res.locals.resultsPost = await postService.findPostById(statusResults)
  } else if (statusResults !== 'results') {
    res.errorPage(404)
    return
  }

  let sortedBy = 1
  if (forms.isInt(req.query.sortBy) && req.query.sortBy > 0 && req.query.sortBy <= constants.MAX_CATEGORY_COUNT) {
    sortedBy = parseInt(req.query.sortBy)
  }

  let rankingsCollection = await eventRatingService.findEntryRankings(res.locals.event, sortedBy)
  let rankings = rankingsCollection.models

  res.render('event/view-event-results', {
    rankings,
    sortedBy
  })
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
    } else if (!forms.isIn(fields.status, ['pending', 'open', 'closed'])) {
      errorMessage = 'Invalid status'
    } else if (!forms.isIn(fields['status-rules'], ['disabled', 'off']) &&
        !forms.isId(fields['status-rules'])) {
      errorMessage = 'Invalid welcome/rules post status'
    } else if (!forms.isIn(fields['status-theme'], ['disabled', 'off', 'voting', 'shortlist', 'results']) &&
        !forms.isId(fields['status-theme'])) {
      errorMessage = 'Invalid theme status'
    } else if (!forms.isIn(fields['status-entry'], ['off', 'open', 'open_unranked', 'closed'])) {
      errorMessage = 'Invalid entry status'
    } else if (!forms.isIn(fields['status-results'], ['disabled', 'off', 'voting', 'results']) &&
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
      if (event.hasChanged('status_theme') && event.get('status_theme') === 'shortlist') {
        await eventThemeService.computeShortlist(event)
        infoMessage = 'Theme shortlist computed. '
      }

      let nameChanged = event.hasChanged('name')
      event = await event.save()
      cache.eventsById.del(event.get('id'))
      cache.eventsByName.del(event.get('name'))
      if (nameChanged) {
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
      theme.set('status', 'banned')
      await theme.save()
    }
  } else if (forms.isId(req.query.unban)) {
    let theme = await eventThemeService.findThemeById(req.query.unban)
    if (theme) {
      theme.set('status', (res.locals.event.get('status_theme') === 'voting') ? 'active' : 'out')
      await theme.save()
    }
  }

  let themesCollection = await eventThemeService.findAllThemes(res.locals.event)
  res.render('event/edit-event-themes', {
    themes: themesCollection.models
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
