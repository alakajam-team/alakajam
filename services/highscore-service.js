'use strict'

/**
 * Service for importing entries from third-party websites
 *
 * @module services/highscore-service
 */

const models = require('../core/models')
const db = require('../core/db')
const enums = require('../core/enums')
const eventTournamentService = require('./event-tournament-service')

module.exports = {
  findHighScores,
  findHighScoresMap,

  findEntryScore,
  findEntryScoreById,
  findUserScoresMapByEntry,

  createEntryScore,
  submitEntryScore,
  setEntryScoreActive,
  deleteEntryScore,
  deleteAllEntryScores,

  refreshEntryRankings
}

async function findHighScores (entry, options = {}) {
  let query = models.EntryScore.where('entry_id', entry.get('id'))
  if (!options.withSuspended) {
    query.where('active', true)
  }
  query.orderBy('score', _rankingDir(entry))

  let fetchOptions = {
    withRelated: ['user']
  }
  if (options.fetchAll) {
    return query.fetchAll(fetchOptions)
  } else {
    fetchOptions.pageSize = 10
    return query.fetchPage(fetchOptions)
  }
}

async function findHighScoresMap (entries) {
  entries = entries.models || entries // Accept collections or arrays

  let highScoresMap = {}
  for (let entry of entries) {
    highScoresMap[entry.get('id')] = await findHighScores(entry)
  }
  return highScoresMap
}

async function createEntryScore (userId, entryId) {
  let entryScore = new models.EntryScore({
    user_id: userId,
    entry_id: entryId
  })
  await entryScore.load(['user'])
  return entryScore
}

async function findEntryScore (userId, entryId) {
  if (userId && entryId) {
    return models.EntryScore.where({
      user_id: userId,
      entry_id: entryId
    })
      .fetch({ withRelated: ['user'] })
  } else {
    return null
  }
}

async function findUserScoresMapByEntry (userId, entries) {
  entries = entries.models || entries // Accept collections or arrays

  if (userId && entries) {
    let entriesToScore = {}
    let entryScores = await models.EntryScore
      .where('user_id', userId)
      .where('entry_id', 'in', entries.map(entry => entry.get('id')))
      .fetchAll({ withRelated: ['user'] })
    for (let entry of entries) {
      entriesToScore[entry.get('id')] = entryScores.find(score => score.get('entry_id') === entry.get('id'))
    }
    return entriesToScore
  } else {
    return null
  }
}

async function findEntryScoreById (id, options = {}) {
  return models.EntryScore.where('id', id)
    .fetch({
      withRelated: options.withRelated || ['user']
    })
}

/**
 * @return any errors, or the updated entry score (ie. with the ranking set)
 */
async function submitEntryScore (entryScore, entry) {
  if (!entryScore || !entry) {
    return { error: 'Internal error (missing score information)' }
  }

  if (entry.get('status_high_score') !== enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    if (entryScore.hasChanged()) {
      // Check ranking before accepting proof-less score
      if (!entryScore.get('proof')) {
        let higherScoreCount = await models.EntryScore
          .where('entry_id', entry.get('id'))
          .where('score', _rankingOperator(entry), entryScore.get('score'))
          .count()
        let ranking = higherScoreCount + 1
        if (ranking <= 10) {
          return { error: 'Pic or it didn\'t happen! You need a screenshot to get in the Top 10 :)' }
        }
      }

      // Save score
      entryScore.set('active', true)
      await entryScore.save()

      // Refresh rankings
      let updatedEntryScore = await refreshEntryRankings(entry, entryScore)
      return updatedEntryScore || entryScore
    } else {
      return entryScore
    }
  } else {
    return { error: 'High scores are disabled on this entry' }
  }
}

async function setEntryScoreActive (id, active) {
  let entryScore = await findEntryScoreById(id, { withRelated: ['entry.details'] })
  if (entryScore && entryScore.get('active') !== active) {
    entryScore.set('active', active)
    await entryScore.save()
    await refreshEntryRankings(entryScore.related('entry'), entryScore,
      { statusTournamentAllowed: [enums.EVENT.STATUS_TOURNAMENT.PLAYING, enums.EVENT.STATUS_TOURNAMENT.CLOSED] })
  }
}

async function deleteEntryScore (entryScore, entry) {
  await entryScore.destroy()
  await refreshEntryRankings(entry, entryScore)
}

async function deleteAllEntryScores (entry) {
  await db.knex('entry_score')
    .where('entry_id', entry.get('id'))
    .delete()
  await refreshEntryRankings(entry)
}

async function refreshEntryRankings (entry, triggeringEntryScore = null, options = {}) {
  let updatedEntryScore = null
  let impactedEntryScores = []

  let scores = await models.EntryScore
    .where('entry_id', entry.get('id'))
    .orderBy('score', _rankingDir(entry))
    .orderBy('updated_at')
    .fetchAll()

  await db.transaction(async function (t) {
    let ranking = 1
    for (let score of scores.models) {
      if (score.get('ranking') !== ranking) {
        score.set('ranking', ranking)
        score.save(null, { transacting: t })
        if (score.get('active')) {
          impactedEntryScores.push(score)
        }
      }
      if (score.get('active')) {
        ranking++
      }

      if (updatedEntryScore && score.get('id') === triggeringEntryScore.get('id')) {
        updatedEntryScore = score
      }
    }
  })

  // Update high score count
  let entryDetails = entry.related('details')
  if (entryDetails.get('high_score_count') !== scores.models.length) {
    await entryDetails.save({ 'high_score_count': scores.models.length }, { patch: true })
  }

  // Refresh active tournament scores
  let activeTournamentEvent = await eventTournamentService.findActiveTournamentPlaying(entry.get('id'), options)
  if (activeTournamentEvent) {
    eventTournamentService.refreshTournamentScores(module.exports, activeTournamentEvent, triggeringEntryScore.get('user_id'), impactedEntryScores, options)
  }

  if (updatedEntryScore) {
    await updatedEntryScore.load(['user'])
  }
  return updatedEntryScore
}

function _rankingDir (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? 'ASC' : 'DESC'
}

function _rankingOperator (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? '<' : '>'
}
