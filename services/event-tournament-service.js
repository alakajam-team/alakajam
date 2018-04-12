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
  findActiveTournamentEvent,
  isActiveTournamentPlaying,

  findTournamentEntries,
  addTournamentEntry,
  saveTournamentEntryOrdering,
  removeTournamentEntry,

  findTournamentScores,
  refreshTournamentScores,
  recalculateAllTournamentScores
}

async function findActiveTournamentEvent () {
  return cache.getOrFetch(cache.general, 'active-tournament-event', async function () {
    return models.Event
      .where('status_tournament', enums.EVENT.STATUS_TOURNAMENT.PLAYING)
      .fetch({ withRelated: ['tournamentEntries'] })
  })
}

async function isActiveTournamentPlaying (entryId) {
  if (entryId) {
    let activeTournamentEvent = await findActiveTournamentEvent()
    if (activeTournamentEvent) {
      let tEntries = activeTournamentEvent.related('tournamentEntries').models
      for (let tEntry of tEntries) {
        if (tEntry.get('entry_id') === entryId) {
          return true
        }
      }
    }
  }
  return false
}

async function findTournamentEntries (event) {
  await event.load(['tournamentEntries.entry.userRoles'])
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

async function refreshTournamentScores (highScoreService, event, triggeringUserId = null, impactedEntryScores = []) {
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
    let totalScore = 0
    let entryScores = {}
    let entryScoresMap = await highScoreService.findUserScoresMapByEntry(userIdToUpdate, entries)
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
    tournamentScoresHaveChanged = (await _saveTournamentScore(event.get('id'), userIdToUpdate, totalScore, entryScores)) || tournamentScoresHaveChanged
  }

  // Refresh tournament rankings if there was any actual change to the scores
  if (tournamentScoresHaveChanged) {
    await _refreshTournamentRankings(event)
  }
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
  if (event.get('status_tournament') === enums.EVENT.STATUS_TOURNAMENT.PLAYING) {
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
  let refreshScoresForEntries = onlyForEntries
  if (!refreshScoresForEntries) {
    let tournamentEntries = await highScoreService.findTournamentEntries(event)
    refreshScoresForEntries = tournamentEntries.map(tEntry => tEntry.related('entry'))
  }

  // Fetch all high scores for these entries
  let allHighScores = []
  for (let entry of refreshScoresForEntries) {
    allHighScores = allHighScores.concat((await highScoreService.findHighScores(entry)).models)
  }

  // Request tournament score refresh for all the scores gathered
  await refreshTournamentScores(highScoreService, event, null, allHighScores)
}

async function _getTournamentEntry (eventId, entryId) {
  return models.TournamentEntry.where({
    event_id: eventId,
    entry_id: entryId
  })
    .fetch()
}
