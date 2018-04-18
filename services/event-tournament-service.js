'use strict'

/**
 * Service for managing tournaments.
 *
 * @module services/event-tournament-service
 */

const models = require('../core/models')
const db = require('../core/db')
const enums = require('../core/enums')
const constants = require('../core/constants')
const cache = require('../core/cache')

module.exports = {
  findActiveTournament,
  findActiveTournamentPlaying,

  findTournamentEntries,
  addTournamentEntry,
  saveTournamentEntryOrdering,
  removeTournamentEntry,

  findTournamentScores,
  refreshTournamentScores,
  recalculateAllTournamentScores
}

async function findActiveTournament (options = {}) {
  let statusTournamentAllowed = options.statusTournamentAllowed || [enums.EVENT.STATUS_TOURNAMENT.PLAYING]
  let cacheKey = 'active-tournament-event-' + statusTournamentAllowed.join('-')
  return cache.getOrFetch(cache.general, cacheKey, async function () {
    return models.Event
      .where('status_tournament', 'IN', statusTournamentAllowed)
      .fetch({ withRelated: ['tournamentEntries'] })
  })
}
// activeTournamentPlaying
async function findActiveTournamentPlaying (entryId, options = {}) {
  if (entryId) {
    let activeTournamentEvent = await findActiveTournament(options)
    if (activeTournamentEvent) {
      let tEntries = activeTournamentEvent.related('tournamentEntries').models
      for (let tEntry of tEntries) {
        if (tEntry.get('entry_id') === entryId) {
          return activeTournamentEvent
        }
      }
    }
  }
  return null
}

async function findTournamentEntries (event, options = {}) {
  if (options.withDetails) {
    await event.load(['tournamentEntries.entry.userRoles', 'tournamentEntries.entry.details'])
  } else {
    await event.load(['tournamentEntries.entry.userRoles'])
  }
  return event.related('tournamentEntries').sortBy(tEntry => tEntry.get('ordering'))
}

async function addTournamentEntry (eventId, entryId) {
  let tEntry = await _getTournamentEntry(eventId, entryId)
  if (!tEntry) {
    tEntry = new models.TournamentEntry({
      event_id: eventId,
      entry_id: entryId
    })
    await tEntry.save()
  }
  return tEntry
}

async function saveTournamentEntryOrdering (eventId, entryId, ordering) {
  let tEntry = await _getTournamentEntry(eventId, entryId)
  tEntry.set('ordering', ordering)
  return tEntry.save()
}

async function removeTournamentEntry (eventId, entryId) {
  let tEntry = await _getTournamentEntry(eventId, entryId)
  if (tEntry) {
    await tEntry.destroy()
  }
}

async function findTournamentScores (event) {
  return models.TournamentScore
    .where('event_id', event.get('id'))
    .where('score', '>', 0)
    .orderBy('ranking')
    .fetchAll({ withRelated: ['user'] })
}

async function refreshTournamentScores (highScoreService, event, triggeringUserId = null, impactedEntryScores = [], options = {}) {
  let statusTournamentAllowed = options.statusTournamentAllowed || [enums.EVENT.STATUS_TOURNAMENT.PLAYING]
  if (!statusTournamentAllowed.includes(event.get('status_tournament'))) {
    return
  }

  let tEntries = await findTournamentEntries(event)
  let entries = tEntries.map(tEntry => tEntry.related('entry'))
  let tournamentScoresHaveChanged = false

  // Make sure tournament scores are updated for both the user who directly saved a score (we at least need to refresh his entry_scores cache),
  // plus the other users that were pushed down in the rankings in the process (skip those who are out of the points though, nothing will change for them)
  let userIdsToUpdate = []
  if (triggeringUserId) {
    userIdsToUpdate.push(triggeringUserId)
  }
  for (let entryScore of impactedEntryScores) {
    if (entryScore.get('ranking') <= constants.TOURNAMENT_POINTS_DISTRIBUTION.length + 1) { // include 11th player in case we need to remove his point
      if (!userIdsToUpdate.includes(entryScore.get('user_id'))) {
        userIdsToUpdate.push(entryScore.get('user_id'))
      }
    }
  }

  // Recalculate tournament scores
  for (let userIdToUpdate of userIdsToUpdate) {
    tournamentScoresHaveChanged = (await refreshTournamentScoresForUser(highScoreService, event.get('id'), entries, userIdToUpdate)) ||
      tournamentScoresHaveChanged
  }

  // Refresh tournament rankings if there was any actual change to the scores
  if (tournamentScoresHaveChanged) {
    await _refreshTournamentRankings(event)
  }
}

async function refreshTournamentScoresForUser (highScoreService, eventId, entries, userId) {
  let totalScore = 0
  let entryScores = {}
  let entryScoresMap = await highScoreService.findUserScoresMapByEntry(userId, entries)
  for (let entryId in entryScoresMap) {
    let entryScore = entryScoresMap[entryId]
    if (entryScore && entryScore.get('active') && entryScore.get('ranking') <= constants.TOURNAMENT_POINTS_DISTRIBUTION.length) {
      let entryPoints = constants.TOURNAMENT_POINTS_DISTRIBUTION[entryScore.get('ranking') - 1]
      totalScore += entryPoints
      entryScores[entryId] = { score: entryScore.get('score') }
      if (entryPoints) {
        entryScores[entryId].ranking = entryScore.get('ranking')
      }
    }
  }
  return _saveTournamentScore(eventId, userId, totalScore, entryScores)
}

async function _saveTournamentScore (eventId, userId, score, entryScores) {
  // Fetch
  let tournamentScoreKeys = {
    event_id: eventId,
    user_id: userId
  }
  let tournamentScore = await models.TournamentScore
    .where(tournamentScoreKeys)
    .fetch()

  // Create if missing
  if (!tournamentScore) {
    tournamentScore = new models.TournamentScore({
      event_id: eventId,
      user_id: userId
    })
  }

  // Update & save
  let tournamentScoreHasChanged = tournamentScore.get('score') !== score
  tournamentScore.set({
    'score': score,
    'entry_scores': entryScores
  })
  await tournamentScore.save()
  return tournamentScoreHasChanged
}

async function _refreshTournamentRankings (event) {
  if ([enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED].includes(event.get('status_tournament'))) {
    let tScores = await models.TournamentScore
      .where('event_id', event.get('id'))
      .orderBy('score', 'DESC')
      .orderBy('updated_at')
      .fetchAll()

    await db.transaction(async function (t) {
      let ranking = 1
      for (let tScore of tScores.models) {
        if (tScore.get('ranking') !== ranking) {
          tScore.set('ranking', ranking)
          tScore.save(null, { transacting: t })
        }
        ranking++
      }
    })
  }
}

async function recalculateAllTournamentScores (highScoreService, event, onlyForEntries = []) {
  // Pick entries for which to fetch scores
  let tournamentEntries = await findTournamentEntries(event)
  let fullRefresh = !onlyForEntries || onlyForEntries.length === 0
  let refreshScoresForEntries = onlyForEntries
  if (fullRefresh) {
    refreshScoresForEntries = tournamentEntries.map(tEntry => tEntry.related('entry'))
  }

  // List all users having entry scores
  let entryUserIds = await db.knex('entry_score')
    .where('entry_id', 'IN', refreshScoresForEntries.map(entry => entry.get('id')))
    .select('user_id')
    .distinct()

  // Append all users having a score in the tournament (might no longer have entry scores)
  let tournamentUserIds = []
  if (fullRefresh) {
    tournamentUserIds = await db.knex('tournament_score')
      .where('event_id', event.get('id'))
      .select('user_id')
      .distinct()
  }

  // Request tournament score refresh for each user
  let allUserIds = entryUserIds.map(data => data['user_id'])
  for (let data of tournamentUserIds) {
    if (allUserIds.indexOf(data['user_id']) === -1) allUserIds.push(data['user_id'])
  }
  for (let userId of allUserIds) {
    await refreshTournamentScoresForUser(highScoreService, event.get('id'), refreshScoresForEntries, userId)
  }
  await _refreshTournamentRankings(event)
}

async function _getTournamentEntry (eventId, entryId) {
  return models.TournamentEntry.where({
    event_id: eventId,
    entry_id: entryId
  })
    .fetch()
}
