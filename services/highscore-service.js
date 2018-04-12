'use strict'

/**
 * Service for importing entries from third-party websites
 *
 * @module services/highscore-service
 */

const models = require('../core/models')
const db = require('../core/db')
const enums = require('../core/enums')

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
  deleteAllEntryScores
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

async function findEntryScoreById (id) {
  return models.EntryScore.where('id', id).fetch({ withRelated: ['user'] })
}

/**
 * @return any errors, or detailed info about the entry scores: { scoreHasChanged, entryScore, impactedEntryScores }
 *         - boolean scoreHasChanged  Whether there was any actual score change
 *         - EntryScore entryScore  The final version of the entry score (ie. with the ranking set)
 *         - EntryScore[] impactedEntryScores The list of scores from other users that were pushed down in the rankings by the new score
 */
async function submitEntryScore (entryScore, entry) {
  if (!entryScore || !entry) {
    return { error: 'Internal error (missing score information)' }
  }

  if (entry.get('status_high_score') !== enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    // Check ranking before accepting proof-less score
    if (!entryScore.get('picture')) {
      let higherScoreCount = await models.EntryScore
        .where('entry_id', entry.get('id'))
        .where('score', _rankingOperator(entry), entryScore.get('score'))
        .count()
      let ranking = higherScoreCount + 1
      if (ranking <= 10) {
        return { error: 'Pic or it didn\'t happen! You need a screenshot to get in the Top 10 :)' }
      }
    }

    let scoreHasChanged = entryScore.hasChanged()
    let result = {
      entryScore: null,
      impactedEntryScores: [],
      scoreHasChanged
    }
    if (scoreHasChanged) {
      // Save score
      entryScore.set('active', true)
      await entryScore.save()

      // Refresh rankings
      result = await _refreshEntryRankings(entry, entryScore.get('id'))
      result.scoreHasChanged = scoreHasChanged
      if (!result.entryScore) {
        console.warn('Failed to retrieve a score ranking', entryScore)
        result.entryScore = entryScore
      }
    }

    return result
  } else {
    return { error: 'High scores are disabled on this entry' }
  }
}

async function setEntryScoreActive (id, active) {
  let entryScore = await findEntryScoreById(id)
  if (entryScore) {
    entryScore.set('active', active)
    await entryScore.save()
  }
}

async function deleteEntryScore (entryScore, entry) {
  await entryScore.destroy()
  await _refreshEntryRankings(entry)
}

async function deleteAllEntryScores (entry) {
  await db.knex('entry_score')
    .where('entry_id', entry.get('id'))
    .delete()
  await _refreshEntryRankings(entry)
}

async function _refreshEntryRankings (entry, retrieveScoreId = null) {
  let result = {
    entryScore: null,
    impactedEntryScores: []
  }

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
          result.impactedEntryScores.push(score)
        }
      }
      if (score.get('active')) {
        ranking++
      }

      if (retrieveScoreId && score.get('id') === retrieveScoreId) {
        result.entryScore = score
      }
    }
  })

  // Update high score count
  let entryDetails = entry.related('details')
  if (entryDetails.get('high_score_count') !== scores.models.length) {
    await entryDetails.save({ 'high_score_count': scores.models.length }, {patch: true})
  }

  if (result.entryScore) {
    await result.entryScore.load(['user'])
  }
  return result
}

function _rankingDir (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? 'ASC' : 'DESC'
}

function _rankingOperator (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? '<' : '>'
}
