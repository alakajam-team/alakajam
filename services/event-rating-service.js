'use strict'

/**
 * Service for managing games ratings & rankings.
 *
 * @module services/event-rating-service
 */

const models = require('../core/models')
const constants = require('../core/constants')
const enums = require('../core/enums')
const db = require('../core/db')
const settingService = require('../services/setting-service')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')
const forms = require('../core/forms')

module.exports = {
  areVotesAllowed,
  canVoteInEvent,
  canVoteOnEntry,

  countEntryVotes,
  findEntryVote,
  saveEntryVote,

  findVoteHistory,
  findEntryRankings,

  refreshEntryRatings,
  refreshEntryScore,
  computeScoreReceivedByUser,
  computeScoreGivenByUserAndEntry,
  computeFeedbackScore,

  computeRankings,
  clearRankings
}

function areVotesAllowed (event) {
  return event &&
    [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE].includes(event.get('status_results'))
}

async function canVoteInEvent (user, event) {
  if (user && areVotesAllowed(event)) {
    return !!(await eventService.findUserEntryForEvent(user, event.get('id')))
  } else {
    return false
  }
}

/**
 * Checks whether a user can vote on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @return {void}
 */
async function canVoteOnEntry (user, entry) {
  if (user && areVotesAllowed(entry.related('event'))) {
    let userEntry = await eventService.findUserEntryForEvent(user, entry.get('event_id'))
    return userEntry && userEntry.get('id') !== entry.get('id')
  } else {
    return false
  }
}

async function countEntryVotes (entry) {
  let result = await models.EntryVote
      .where('entry_id', entry.get('id'))
      .count()
  return parseInt(result)
}

/**
 * Finds the votes an user cast on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @return {void}
 */
async function findEntryVote (user, entry) {
  return models.EntryVote.where({
    entry_id: entry.get('id'),
    user_id: user.get('id')
  }).fetch()
}

/**
 * Saves the votes on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @param  {Event} event
 * @param  {array(number)} voteData
 * @return {void}
 */
async function saveEntryVote (user, entry, event, voteData) {
  await entry.load(['details', 'event.details'])
  let eventDetails = event.related('details')

  let expectedVoteCount = eventDetails.get('category_titles').length
  if (voteData.length !== expectedVoteCount) {
    throw new Error('there must be information for exactly ' + expectedVoteCount + ' voting categories')
  }

  let vote = await findEntryVote(user, entry)
  if (!vote) {
    vote = new models.EntryVote({
      user_id: user.get('id'),
      entry_id: entry.get('id'),
      event_id: event.get('id')
    })
  }

  let hasActualVote = false
  let optouts = entry.related('details').get('optouts') || []
  for (let i in voteData) {
    let categoryIndex = (parseInt(i) + 1)
    if (!forms.isFloat(voteData[i], {min: 0, max: 10}) ||
        optouts.includes(eventDetails.get('category_titles')[categoryIndex - 1])) {
      voteData[i] = 0
    }

    vote.set('vote_' + categoryIndex, voteData[i] || 0)
    hasActualVote = hasActualVote || voteData[i] > 0
  }

  let refreshRequired = true
  if (hasActualVote) {
    if (vote.get('id')) {
      refreshRequired = false
    }
    await vote.save()
  } else if (vote.get('id')) {
    await vote.destroy()
  }

  await refreshEntryRatings(entry)
  if (refreshRequired) {
    refreshEntryScore(entry, event)
  }
}

/**
 * Finds the votes a user cast during an event
 * @param  {integer} userId
 * @param  {Event} event
 * @param  {object} options allowed: pageSize withRelated
 * @return {void}
 */
async function findVoteHistory (userId, event, options = {}) {
  let query = models.EntryVote.where({
    user_id: userId,
    event_id: event.get('id')
  })
    .orderBy('updated_at', 'DESC')

  if (options.pageSize) {
    return query.fetchPage({
      pageSize: options.pageSize || 50,
      withRelated: options.withRelated || ['entry.userRoles']
    })
  } else {
    return query.fetchAll({
      withRelated: options.withRelated || ['entry.userRoles']
    })
  }
}

/**
 *
 * @param  {Event} event
 * @param  {number} categoryIndex
 * @return {Collection(Entry)}
 */
async function findEntryRankings (event, division, categoryIndex) {
  if (categoryIndex > 0 && categoryIndex <= constants.MAX_CATEGORY_COUNT) {
    return models.Entry.query(function (qb) {
      return qb.leftJoin('entry_details', 'entry_details.entry_id', 'entry.id')
        .where({
          'event_id': event.get('id'),
          'division': division
        })
        .whereNotNull('entry_details.ranking_' + categoryIndex)
        .orderBy('entry_details.ranking_' + categoryIndex)
        .orderBy('entry.id', 'desc')
    }).fetchAll({ withRelated: ['userRoles', 'details'] })
  } else {
    throw new Error('Invalid category index: ' + categoryIndex)
  }
}

/**
 * Refreshes the average ratings for a given entry
 * @param  {Entry} entry
 * @return {void}
 */
async function refreshEntryRatings (entry) {
  await entry.load(['votes', 'details', 'event.details'])
  let event = entry.related('event')
  let votes = entry.related('votes')

  let categoryCount = event.related('details').get('category_titles').length

  let ratingCount = []
  let ratingSum = []

  let categoryIndexes = _range(1, categoryCount)
  for (let categoryIndex of categoryIndexes) {
    ratingCount[categoryIndex] = 0
    ratingSum[categoryIndex] = 0
  }

  votes.each(function (vote) {
    for (let categoryIndex of categoryIndexes) {
      let rating = parseFloat(vote.get('vote_' + categoryIndex) || 0)
      if (rating !== 0) {
        ratingCount[categoryIndex]++
        ratingSum[categoryIndex] += rating
      }
    }
  })

  // Only give a rating if the entry has enough votes (tolerate being a bit under the minimum)
  let entryDetails = entry.related('details')
  let requiredRatings = Math.floor(0.8 * parseInt(await settingService.find(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, '1')))
  for (let categoryIndex of categoryIndexes) {
    let averageRating
    if (ratingCount[categoryIndex] >= requiredRatings) {
      averageRating = 1.0 * ratingSum[categoryIndex] / ratingCount[categoryIndex]
    } else {
      averageRating = null
    }
    entryDetails.set('rating_' + categoryIndex, averageRating)
  }
  await entryDetails.save()
}

function _range (from, to) {
  return Array.from(new Array(to), (x, i) => i + from)
}

/**
 *
 * @param  {Entry} entry
 * @param  {Event} event
 * @param  {object} options (optional) force
 * @return {void}
 */
async function refreshEntryScore (entry, event, options = {}) {
  await entry.load(['details', 'comments', 'userRoles', 'votes'])
  let received = (await computeScoreReceivedByUser(entry, event)).total
  let given = (await computeScoreGivenByUserAndEntry(entry, event)).total

  entry.set('feedback_score', computeFeedbackScore(received, given))
  await entry.save()

  let entryDetails = entry.related('details')
  entryDetails.set('rating_count', entry.related('votes').length)
  await entryDetails.save()
}

/* Compute received score */
async function computeScoreReceivedByUser (entry, event) {
  let receivedByUser = {}
  for (let comment of entry.related('comments').models) {
    // Earn up to 3 points per user from comments
    let userId = comment.get('user_id')
    receivedByUser[userId] = receivedByUser[userId] || { commentScore: 0 }
    receivedByUser[userId].commentScore += comment.get('feedback_score')
  }
  for (let vote of entry.related('votes').models) {
    // Earn 2 points per user from votes
    let userId = vote.get('user_id')
    receivedByUser[userId] = receivedByUser[userId] || {}
    receivedByUser[userId].voteScore = 2
  }

  let result = {
    receivedByUser,
    total: 0
  }
  for (let userId in receivedByUser) {
    // Pick the highest score among comments & votes on each user
    result.total += Math.max(receivedByUser[userId].commentScore || 0, receivedByUser[userId].voteScore || 0)
  }
  return result
}

/* Compute given score using comments & votes from all the team */
async function computeScoreGivenByUserAndEntry (entry, event) {
  let givenByUserAndEntry = {}
  let userRoles = entry.related('userRoles')
  for (let userRole of userRoles.models) {
    // Earn up to 3 points per user from comments
    let userId = userRole.get('user_id')
    let givenComments = await postService.findCommentsByUserAndEvent(userId, event.get('id'))
    for (let givenComment of givenComments.models) {
      let key = userId + '_to_' + givenComment.get('node_id')
      givenByUserAndEntry[key] = givenByUserAndEntry[key] || {
        commentScore: 0,
        userId: userId,
        entryId: givenComment.get('node_id')
      }
      givenByUserAndEntry[key].commentScore += givenComment.get('feedback_score')
    }

    // Earn 2 points per user from votes
    let votes = await findVoteHistory(userRole.get('user_id'), event)
    for (let vote of votes.models) {
      let key = vote.get('user_id') + '_to_' + vote.get('entry_id')
      givenByUserAndEntry[key] = givenByUserAndEntry[key] || {
        commentScore: 0,
        userId: vote.get('user_id'),
        entryId: vote.get('entry_id')
      }
      givenByUserAndEntry[key].voteScore = 2
    }
  }

  let result = {
    givenByUserAndEntry,
    total: 0
  }
  for (let key in givenByUserAndEntry) {
    // Pick the highest score among comments & votes on each user
    result.total += Math.max(givenByUserAndEntry[key].commentScore || 0, givenByUserAndEntry[key].voteScore || 0)
  }

  return result
}

function computeFeedbackScore (received, given) {
  // This formula boosts a little bit low scores (< 30) to ensure everybody gets at least some comments,
  // and to reward people for posting their first comments. It also nerfs & caps very active commenters to prevent
  // them from trusting the front page. Finally, negative scores are not cool so we use 100 as the origin.
  // NB. It is inspired by the actual LD sorting equation: D = 50 + R - 5*sqrt(min(C,100))
  // (except that here, higher is better)
  return Math.floor(Math.max(0, 74 + 8.5 * Math.sqrt(10 + Math.min(given, 100)) - received))
}

async function computeRankings (event) {
  let rankedDivisions = [enums.DIVISION.SOLO, enums.DIVISION.TEAM]
  let rankedEntries = await models.Entry
    .where('event_id', event.get('id'))
    .where('division', '<>', enums.DIVISION.UNRANKED)
    .fetchAll({
      withRelated: ['details', 'votes']
    })

  // For each ranking category...
  let categoryCount = event.related('details').get('category_titles').length
  let categoryIndexes = _range(1, categoryCount)
  for (let categoryIndex of categoryIndexes) {
    let sortedEntries = rankedEntries.sortBy(entry => -entry.related('details').get('rating_' + categoryIndex))

    // For each division...
    for (let division of rankedDivisions) {
      let rank = 1
      let previousDetails = null

      // For each entry, best to worst...
      let divisionEntries = sortedEntries.filter(entry => entry.get('division') === division)
      for (let entry of divisionEntries) {
        let details = entry.related('details')

        // Rank it, if it has an average rating if the given category
        if (details.get('rating_' + categoryIndex) >= 1) {
          let tie = previousDetails &&
            previousDetails.get('rating_' + categoryIndex) === details.get('rating_' + categoryIndex)
          if (tie) {
            details.set('ranking_' + categoryIndex, previousDetails.get('ranking_' + categoryIndex))
          } else {
            details.set('ranking_' + categoryIndex, rank)
            previousDetails = details
          }
          rank++
        }
      }
    }
  }

  return db.transaction(async function (transaction) {
    for (let entry of rankedEntries.models) {
      await entry.related('details').save(null, { transacting: transaction })
    }
  })
}

async function clearRankings (event) {
  let entries = await models.Entry
    .where('entry.event_id', event.get('id'))
    .where('entry.division', '<>', enums.DIVISION.UNRANKED)
    .fetchAll({
      withRelated: ['details', 'votes']
    })

  let categoryCount = event.related('details').get('category_titles').length
  let categoryIndexes = _range(1, categoryCount)

  return db.transaction(async function (transaction) {
    for (let entry of entries.models) {
      let entryDetails = entry.related('details')
      for (let categoryIndex of categoryIndexes) {
        entryDetails.set('ranking_' + categoryIndex, null)
      }
      await entryDetails.save(null, { transacting: transaction })
    }
  })
}
