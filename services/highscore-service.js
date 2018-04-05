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

  createEntryScore,
  findEntryScore,
  submitEntryScore,
  deleteEntryScore
}

async function findHighScores (entry) {
  return models.EntryScore.where('entry_id', entry.get('id'))
    .orderBy('score', _rankingDir(entry))
    .fetchPage({
      pageSize: 10,
      withRelated: ['user']
    })
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
        return { error: 'You must submit a proof screenshot to get in the Top 10' }
      }
    }

    // Save score and refresh rankings
    await entryScore.save()
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

async function deleteEntryScore (entryScore, entry) {
  await entryScore.destroy()
  _refreshEntryRankings(entry)
}

async function _refreshEntryRankings (entry, retrieveScoreId = null) {
  let retrievedScore = null

  let scores = await models.EntryScore
    .where('entry_id', entry.get('id'))
    .orderBy('score', _rankingDir(entry))
    .fetchAll()

  await db.transaction(async function (t) {
    let ranking = 1
    for (let score of scores.models) {
      if (score.get('ranking') !== ranking) {
        score.set('ranking', ranking)
        score.save(null, { transacting: t })
      }
      if (retrieveScoreId && score.get('id') === retrieveScoreId) {
        retrievedScore = score
        await retrievedScore.load(['user'], { transacting: t })
      }
      ranking++
    }
  })

  // Update high score count
  let entryDetails = entry.related('details')
  if (entryDetails.get('high_score_count') !== scores.models.length) {
    await entryDetails.save({ 'high_score_count': scores.models.length }, {patch: true})
  }

  return retrievedScore
}

function _rankingDir (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? 'DESC' : 'ASC'
}

function _rankingOperator (entry) {
  return entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.REVERSED ? '<' : '>'
}
