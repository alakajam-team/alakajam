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
  findEntryScoresMap,

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

async function createEntryScore (user, entry) {
  let entryScore = new models.EntryScore({
    user_id: user.get('id'),
    entry_id: entry.get('id')
  })
  await entryScore.load(['user'])
  return entryScore
}

async function findEntryScore (user, entry) {
  if (user && entry) {
    return models.EntryScore.where({
      user_id: user.get('id'),
      entry_id: entry.get('id')
    })
      .fetch({ withRelated: ['user'] })
  } else {
    return null
  }
}

async function findEntryScoresMap (user, entries) {
  entries = entries.models || entries // Accept collections or arrays

  if (user && entries) {
    let entriesToScore = {}
    let entryScores = await models.EntryScore
      .where('user_id', user.get('id'))
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
 * @return any errors, or the entry score with up-to-date ranking set
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

    // Save score
    entryScore.set('active', true)
    await entryScore.save()

    // Refresh rankings
    let rankedEntryScore = _refreshEntryRankings(entry, entryScore.get('id'))
    if (rankedEntryScore) {
      return rankedEntryScore
    } else {
      console.error('Failed to retrieve a score ranking', entryScore)
      return entryScore
    }
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
  let retrievedScore = null

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
      }
      if (score.get('active')) {
        ranking++
      }

      if (retrieveScoreId && score.get('id') === retrieveScoreId) {
        retrievedScore = score
      }
    }
  })

  // Update high score count
  let entryDetails = entry.related('details')
  if (entryDetails.get('high_score_count') !== scores.models.length) {
    await entryDetails.save({ 'high_score_count': scores.models.length }, {patch: true})
  }

  if (retrievedScore) {
    await retrievedScore.load(['user'])
  }
  return retrievedScore
}

function _rankingDir (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? 'ASC' : 'DESC'
}

function _rankingOperator (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? '<' : '>'
}
