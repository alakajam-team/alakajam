'use strict'

/**
 * Service for managing theme voting.
 *
 * @module services/event-theme-service
 */

const models = require('../core/models')
const constants = require('../core/constants')
const enums = require('../core/enums')
const db = require('../core/db')
const forms = require('../core/forms')
const cache = require('../core/cache')
const settingService = require('./setting-service')
const moment = require('moment')

module.exports = {
  isThemeVotingAllowed,

  findThemeById,
  findThemeIdeasByUser,
  saveThemeIdeas,

  findThemeVotesHistory,
  findThemesToVoteOn,
  findThemeShortlistVotes,
  saveVote,
  saveShortlistVotes,
  countShortlistVotes,

  findAllThemes,
  findBestThemes,
  findShortlist,
  computeShortlist,
  computeEliminatedShortlistThemes,
  computeNextShortlistEliminationTime
}

async function isThemeVotingAllowed (event) {
  if (event.get('status') === enums.EVENT.STATUS.OPEN &&
    event.get('status_theme') === enums.EVENT.STATUS_THEME.VOTING) {
    let votingAllowedCacheKey = event.get('name') + '_event_voting_allowed_'
    if (cache.general.get(votingAllowedCacheKey) === undefined) {
      let themeIdeasRequired = parseInt(await settingService.find(constants.SETTING_EVENT_THEME_IDEAS_REQUIRED, '10'))
      let themeIdeaCount = await models.Theme.where({
        event_id: event.get('id')
      }).count()
      cache.general.set(votingAllowedCacheKey, themeIdeaCount >= themeIdeasRequired)
    }
    return cache.general.get(votingAllowedCacheKey)
  } else {
    return false
  }
}

async function findThemeById (id) {
  return models.Theme.where('id', id).fetch()
}

/**
 * Saves the theme ideas of an user for an event
 * @param user {User} user model
 * @param event {Event} event model
 * @param ideas {array(object)} An array of exactly 3 ideas (all fields optional): [{label, id}]
 */
async function findThemeIdeasByUser (user, event) {
  return models.Theme.where({
    user_id: user.get('id'),
    event_id: event.get('id')
  })
    .orderBy('id')
    .fetchAll()
}

/**
 * Saves the theme ideas of an user for an event
 * @param user {User} user model
 * @param event {Event} event model
 * @param ideas {array(object)} An array of exactly 3 ideas: [{title, id}]. Not filling the title
 * deletes the idea, not filling the ID creates one instead of updating it.
 */
async function saveThemeIdeas (user, event, ideas) {
  let ideasToKeep = []
  let ideasToCreate = []
  let themesToDelete = []

  // Compare form with the existing user themes
  let existingThemes = await findThemeIdeasByUser(user, event)
  for (let existingTheme of existingThemes.models) {
    let ideaFound = ideas.find(idea => parseInt(idea.id) === existingTheme.get('id'))
    if (!ideaFound || ideaFound.title !== existingTheme.get('title')) {
      if (existingTheme.get('status') === enums.THEME.STATUS.ACTIVE ||
          existingTheme.get('status') === enums.THEME.STATUS.DUPLICATE) {
        themesToDelete.push(existingTheme)
      }
    } else {
      ideasToKeep.push(ideaFound)
    }
  }
  for (let idea of ideas) {
    if (!ideasToKeep.includes(idea) && idea.title) {
      ideasToCreate.push(idea)
    }
  }

  // Delete obsolete themes
  let tasks = []
  let ideasSubmitted = existingThemes.models.length - themesToDelete.length
  for (let themeToDelete of themesToDelete) {
    tasks.push(themeToDelete.destroy())
  }
  await Promise.all(tasks)

  // Create themes
  let maxThemeSuggestions = parseInt(await settingService.find(constants.SETTING_EVENT_THEME_SUGGESTIONS, '3'))
  for (let idea of ideasToCreate) {
    if (ideasSubmitted < maxThemeSuggestions) {
      let theme = new models.Theme({
        user_id: user.get('id'),
        event_id: event.get('id'),
        title: idea.title,
        status: enums.THEME.STATUS.ACTIVE
      })
      await _handleDuplicates(theme)
      await theme.save()
      ideasSubmitted++
    } else {
      break
    }
  }

  _refreshEventThemeStats(event)
}

/**
 * Sets the theme status to "duplicate" if another theme is identical
 */
async function _handleDuplicates (theme) {
  theme.set('slug', forms.slug(theme.get('title')))

  let query = models.Theme.where({
    slug: theme.get('slug'),
    event_id: theme.get('event_id')
  })
  if (theme.get('id')) {
    query = query.where('id', '<>', theme.get('id'))
  }
  if ((await query.fetch()) !== null) {
    theme.set('status', enums.THEME.STATUS.DUPLICATE)
  }
}

/**
 * Returns the 30 latest votes by the user
 * @param user {User} user model
 * @param event {Event} event model
 * @param options {object} (optional) count
 */
async function findThemeVotesHistory (user, event, options = {}) {
  let query = models.ThemeVote.where({
    event_id: event.get('id'),
    user_id: user.get('id')
  })
  if (options.count) {
    return query.count()
  } else {
    return query.orderBy('id', 'DESC')
      .fetchPage({
        pageSize: 30,
        withRelated: ['theme']
      })
  }
}

/**
 * Returns a page of 10 themes that a user can vote on
 * @param user {User} (optional) user model
 * @param event {Event} event model
 */
async function findThemesToVoteOn (user, event) {
  let query = models.Theme
  if (user) {
    query = query.query(function (qb) {
      qb.leftOuterJoin('theme_vote', function () {
        this.on('theme.id', '=', 'theme_vote.theme_id')
        this.andOn('theme_vote.user_id', '=', user.get('id'))
      })
    })
      .where({
        status: enums.THEME.STATUS.ACTIVE,
        'theme.event_id': event.get('id'),
        'theme_vote.user_id': null
      })
      .where('theme.user_id', '<>', user.get('id'))
  } else {
    query = query.where('event_id', event.get('id'))
      .where('status', 'IN', [enums.THEME.STATUS.ACTIVE, enums.THEME.STATUS.SHORTLIST])
  }

  // Grab the 20 oldest theme ideas, then just keep the 10 with the least notes.
  // This helps new themes catch up with the pack fast, while being much better randomized
  // than just showing the themes with the least notes.
  let themesCollection = await query.orderBy('updated_at')
    .fetchPage({ pageSize: 20 })
  let sortedThemes = themesCollection.sortBy(theme => theme.get('notes'))
  let themesToVoteOn = sortedThemes.splice(0, 10)
  let shuffledThemes = new db.Collection(themesToVoteOn).shuffle()
  return new db.Collection(shuffledThemes)
}

async function findThemeShortlistVotes (user, event) {
  let shortlistCollection = await findShortlist(event)
  let shortlistIds = []
  shortlistCollection.each(theme => shortlistIds.push(theme.get('id')))
  return models.ThemeVote.where({
    user_id: user.get('id')
  })
    .where('theme_id', 'IN', shortlistIds)
    .fetchAll()
}

/**
 * Saves a theme vote
 * @param user {User} user model
 * @param event {Event} event model
 * @param themeId {integer}
 * @param score {integer}
 * @param options {object} doNotSave
 */
async function saveVote (user, event, themeId, score, options = {}) {
  let voteCreated = false
  let expectedStatus = null
  let result = {}

  if (event.get('status_theme') === enums.EVENT.STATUS_THEME.VOTING && [-1, 1].indexOf(score) !== -1) {
    expectedStatus = enums.THEME.STATUS.ACTIVE
  } else if (event.get('status_theme') === enums.EVENT.STATUS_THEME.SHORTLIST && score >= 1 && score <= 10) {
    expectedStatus = enums.THEME.STATUS.SHORTLIST
  }

  if (expectedStatus) {
    let theme = await models.Theme.where('id', themeId).fetch()

    if (theme.get('status') === expectedStatus) {
      let vote = await models.ThemeVote.where({
        user_id: user.get('id'),
        event_id: event.get('id'),
        theme_id: themeId
      }).fetch()

      if (vote) {
        theme.set('score', theme.get('score') + score - (vote.get('score') || 0))
        vote.set('score', score)
      } else {
        theme.set({
          'score': theme.get('score') + score,
          'notes': theme.get('notes') + 1
        })
        vote = new models.ThemeVote({
          theme_id: themeId,
          user_id: user.get('id'),
          event_id: event.get('id'),
          score: score
        })
        voteCreated = true
      }
      theme.set('normalized_score', 1.0 * theme.get('score') / theme.get('notes'))

      result = {
        theme,
        vote
      }
      if (!options.doNotSave) {
        await Promise.all([theme.save(), vote.save()])
      }
    }
  }

  if (expectedStatus === enums.THEME.STATUS.ACTIVE && voteCreated) {
    _refreshEventThemeStats(event)

    // Eliminate a theme every x votes. No need for DB calls, just count in-memory
    let eliminationThreshold = parseInt(await settingService.find(constants.SETTING_EVENT_THEME_ELIMINATION_MODULO, '10'))
    let uptimeVotes = cache.general.get('uptime_votes') || 0
    if (uptimeVotes % eliminationThreshold === 0) {
      _eliminateLowestTheme(event)
    }
    uptimeVotes++
    cache.general.set('uptime_votes', uptimeVotes)
  }

  return result
}

async function _eliminateLowestTheme (event) {
  let eliminationMinNotes = parseInt(await settingService.find(constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, '5'))

  let battleReadyThemesQuery = await models.Theme.where({
    event_id: event.get('id'),
    status: enums.THEME.STATUS.ACTIVE
  })
    .where('notes', '>=', eliminationMinNotes)

  // Make sure we have at least enough themes to fill our shortlist before removing one
  if (await battleReadyThemesQuery.count() > 10) {
    let loserTheme = await models.Theme.where({
      event_id: event.get('id'),
      status: 'active'
    })
      .where('notes', '>=', eliminationMinNotes)
      .orderBy('normalized_score')
      .orderBy('created_at')
      .fetch()

    let betterThemeCount = await models.Theme.where({
      event_id: event.get('id')
    })
      .where('normalized_score', '>', loserTheme.get('normalized_score'))
      .count()

    await event.load('details')
    loserTheme.set({
      'status': enums.THEME.STATUS.OUT,
      'ranking': 1.0 * betterThemeCount / (event.related('details').get('theme_count') || 1)
    })
    await loserTheme.save()
  }
}

async function saveShortlistVotes (user, event, ids) {
  let shortlistCollection = await findShortlist(event)
  let sortedShortlist = shortlistCollection.sortBy(theme => {
    return ids.indexOf(theme.get('id'))
  })

  let score = 10
  let results = []
  for (let theme of sortedShortlist) {
    results.push(await saveVote(user, event, theme.get('id'), score, {doNotSave: true}))
    score--
  }

  await db.transaction(async function (t) {
    let saveOptions = { transacting: t }
    for (let result of results) {
      if (result.theme) result.theme.save(null, saveOptions)
      if (result.vote) result.vote.save(null, saveOptions)
    }
  })
}

async function countShortlistVotes (event) {
  return cache.getOrFetch(cache.general, 'shortlist_votes_' + event.get('name'),
    async function () {
      return models.ThemeVote
        .where({
          'event_id': event.get('id'),
          'score': 9
        })
        .count()
    }, 10 * 60 /* 10 min TTL */)
}

async function findAllThemes (event, options = {}) {
  let query = models.Theme.where('event_id', event.get('id'))
  if (options.shortlistEligible) {
    query = query.where('status', '<>', enums.THEME.STATUS.OUT)
      .where('status', '<>', enums.THEME.STATUS.BANNED)
  }
  return query.orderBy('normalized_score', 'DESC')
    .orderBy('created_at')
    .fetchAll()
}

async function findBestThemes (event) {
  let eliminationMinNotes = parseInt(await settingService.find(constants.SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, '5'))
  return models.Theme.where({
    event_id: event.get('id')
  })
    .where('status', '<>', enums.THEME.STATUS.BANNED)
    .where('notes', '>=', eliminationMinNotes)
    .orderBy('normalized_score', 'DESC')
    .orderBy('created_at')
    .fetchPage({ pageSize: 10 })
}

async function findShortlist (event) {
  return models.Theme.where({
    event_id: event.get('id'),
    status: 'shortlist'
  })
    .orderBy('score', 'DESC')
    .fetchAll()
}

async function computeShortlist (event) {
  // Mark all themes as out
  let allThemesCollection = await findAllThemes(event, {shortlistEligible: true})
  await db.transaction(async function (t) {
    allThemesCollection.each(function (theme) {
      theme.set('status', enums.THEME.STATUS.OUT)
      theme.save(null, { transacting: t })
    })
  })

  // Compute new shortlist
  let bestThemeCollection = await findBestThemes(event)
  await db.transaction(async function (t) {
    bestThemeCollection.each(function (theme) {
      theme.set('status', enums.THEME.STATUS.SHORTLIST)
      theme.save(null, { transacting: t })
    })
  })
}

async function _refreshEventThemeStats (event) {
  await event.load('details')
  let eventDetails = event.related('details')

  // Throttled: updates every 5 seconds max
  if (eventDetails.get('updated_at') < new Date().getTime() - 5000) {
    eventDetails.set('theme_count',
      await models.Theme.where({
        event_id: event.get('id')
      }).count())
    eventDetails.set('active_theme_count',
      await models.Theme.where({
        event_id: event.get('id'),
        status: 'active'
      }).count())
    eventDetails.set('theme_vote_count',
      await models.ThemeVote.where({
        event_id: event.get('id')
      }).count())
    eventDetails.save()
  }

  if (!(await isThemeVotingAllowed(event))) {
    cache.general.del(event.get('name') + '_event_voting_allowed_')
  }
}

/**
 * @param event Event with loaded details
 * @return number of eliminated themes
 */
function computeEliminatedShortlistThemes (event) {
  let eliminated = 0

  let shortlistEliminationInfo = event.related('details').get('shortlist_elimination')
  if (shortlistEliminationInfo.start && shortlistEliminationInfo.delay && parseInt(shortlistEliminationInfo.delay) > 0) {
    let delay = parseInt(shortlistEliminationInfo.delay)
    let eliminationDate = moment(shortlistEliminationInfo.start)
    let now = moment()

    // We can eliminate at most 7 themes (leaving 3 until the reveal)
    while (eliminationDate.isBefore(now) && eliminated < 7) {
      eliminationDate.add(delay, 'minutes')
      eliminated++
    }
  }

  return eliminated
}

/**
 * @param event Event with loaded details
 * @return moment time
 */
function computeNextShortlistEliminationTime (event) {
  let alreadyEliminated = 0

  let shortlistEliminationInfo = event.related('details').get('shortlist_elimination')
  if (shortlistEliminationInfo.start) {
    let nextEliminationDate = moment(shortlistEliminationInfo.start)
    let now = moment()

    if (now.isBefore(nextEliminationDate)) {
      return nextEliminationDate
    } else if (shortlistEliminationInfo.delay && parseInt(shortlistEliminationInfo.delay) > 0) {
      let delay = parseInt(shortlistEliminationInfo.delay)

      // We can eliminate at most 7 themes (leaving 3 until the reveal)
      while (nextEliminationDate.isBefore(now) && alreadyEliminated < 7) {
        nextEliminationDate.add(delay, 'minutes')
        alreadyEliminated++
      }

      if (alreadyEliminated < 7) {
        return nextEliminationDate
      }
    }
  }

  return null
}
