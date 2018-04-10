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
const highScoreService = require('./highscore-service')

module.exports = {
  findActiveTournamentEvent,
  isActiveTournamentPlaying,
  
  findTournamentEntries,
  addTournamentEntry,
  saveTournamentEntryOrder,
  removeTournamentEntry,

  findTournamentScores,
  refreshTournamentScore,
  
  findEntryScoreMapForTournament
}

async function findActiveTournamentEvent () {
  return cache.getOrFetch(cache.general, 'active-tournament-event', async function () {
    return models.Event
      .where('status_tournament', enums.EVENT.STATUS_TOURNAMENT.PLAYING)
      .fetch({ withRelated: ['tournamentEntries'] })
  })
}

async function isActiveTournamentPlaying (entry) {
  let activeTournamentEvent = await findActiveTournamentEvent()
  if (activeTournamentEvent) {
    let tEntries = activeTournamentEvent.related('tournamentEntries').models
    for (let tEntry of tEntries) {
      if (tEntry.get('entry_id') === entry.get('id')) {
        return true
      }
    }
  }
  return false
}

async function findTournamentEntries (event) {
  await event.load(['tournamentEntries.entry.userRoles'])
  return event.related('tournamentEntries').orderBy('order')
}

async function addTournamentEntry (event, entry) {
  let tEntry = await _getTournamentEntry(event, entry)
  if (!tEntry) {
    tEntry = new models.TournamentEntry({
      event_id: event.get('id'),
      entry_id: entry.get('id')
    })
    await tEntry.save()
  }
  return tEntry
}

async function saveTournamentEntryOrder (event, entry, order) {
  let tEntry = await _getTournamentEntry(event, entry)
  tEntry.set('order', order)
  return tEntry.save()
}

async function removeTournamentEntry (event, entry) {
  let tEntry = await _getTournamentEntry(event, entry)
  if (tEntry) {
    await tEntry.destroy()
  }
}

async function refreshTournamentScore (event, user) {
  let tEntries = await findTournamentEntries(event)
  let entries = tEntries.map(tEntry => tEntry.related('entry'))

  let totalScore = 0
  let entryScoresMap = await highScoreService.findUserScoresMapByEntry(user, entries)
  for (let entryId in entryScoresMap) {
    let entryScore = entryScoresMap[entryId]
    if (entryScore && entryScore.get('active') && entryScore.get('ranking') <= constants.TOURNAMENT_POINTS_DISTRIBUTION.length) {
      totalScore += constants.TOURNAMENT_POINTS_DISTRIBUTION[entryScore.get('ranking') - 1]
    }
  }
  
  let scoreHasChanged = await _saveTournamentScore(event, user, totalScore)
  if (scoreHasChanged) {
    await _refreshTournamentRankings(event)
  }
}

async function _saveTournamentScore (event, user, score) {
  // Fetch
  let tournamentScoreKeys = {
    event_id: event.get('id'),
    user_id: user.get('id')
  }
  let tournamentScore = await models.TournamentScore
    .where(tournamentScoreKeys)
    .fetch()

  // Create if missing
  if (!tournamentScore) {
    tournamentScore = new models.TournamentScore({
      event_id: event.get('id'),
      user_id: user.get('id')
    })
  }

  // Update & save
  if (tournamentScore.get('score') !== score) {
    tournamentScore.set('score', score)
    await tournamentScore.save()
    return true
  } else {
    return false
  }
}

async function findTournamentScores (event) {
  return models.TournamentScore
    .where('event_id', event.get('id'))
    .orderBy('ranking')
    .fetchAll({ withRelated: ['user'] })
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

async function _getTournamentEntry (event, entry) {
  return models.TournamentEntry.where({
    event_id: event.get('id'),
    entry_id: entry.get('id')
  })
    .fetch()
}

async function findEntryScoreMapForTournament (event) {
  let tEntries = await findTournamentEntries(event)
  let entryIds = tEntries.models.map(tEntry => tEntry.related('entry').get('id'))
  let entryScores = await models.EntryScore
    .where('entry_id', 'in', entryIds)
    .fetchAll()
    
  let map = {}
  for (let entryScore of entryScores.models) {
    let entryId = entryScore.get('entry_id')
    let userId = entryScore.get('user_id')
    
    if (!map[entryId]) map[entryId] = {}
    map[entryId][userId] = entryScore
  }
  
  return map
}
