'use strict'

/**
 * Service for managing games ratings & rankings.
 *
 * @module services/event-rating-service
 */

const models = require('../core/models')
const constants = require('../core/constants')
const settingService = require('../services/setting-service')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')

module.exports = {
  canVoteOnEntry,
  findEntryVote,
  saveEntryVote,

  findVoteHistory,
  findEntryRankings,

  refreshEntryRatings,
  refreshEntryScore,
  computeScoreReceivedByUser,
  computeScoreGivenByUserAndEntry,
  computeFeedbackScore
}

/**
 * Checks whether a user can vote on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @return {void}
 */
async function canVoteOnEntry (user, entry) {
  if (entry.related('event').get('status_results') === 'voting') {
    let userEntry = await eventService.findUserEntryForEvent(user, entry.get('event_id'))
    return userEntry && userEntry.get('id') !== entry.get('id')
  } else {
    return false
  }
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
    if (optouts.includes(eventDetails.get('category_titles')[categoryIndex - 1])) {
      console.log('optout! ' + i)
      voteData[i] = 0
    }
    vote.set('vote_' + categoryIndex, voteData[i] || 0)
    hasActualVote = hasActualVote || voteData[i] > 0
  }

  if (hasActualVote) {
    if (!vote.get('id')) {
      refreshEntryScore(entry, event)
    }
    await vote.save()
  } else if (vote.get('id')) {
    await vote.destroy()
  }

  await refreshEntryRatings(entry)
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
        .where('entry_details.rating_' + categoryIndex, '>', 0)
        .orderBy('entry_details.rating_' + categoryIndex, 'desc')
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
      let rating = vote.get('vote_' + categoryIndex)
      if (rating !== 0) {
        ratingCount[categoryIndex]++
        ratingSum[categoryIndex] += parseFloat(rating)
      }
    }
  })

  let entryDetails = entry.related('details')
  let requiredRatings = parseInt(await settingService.find(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, '1'))
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
  // Refresh at most every minute
  if (new Date().getTime() - entry.get('updated_at').getTime() > 60000 || options.force) {
    await entry.load(['comments', 'userRoles', 'votes'])
    let received = (await computeScoreReceivedByUser(entry, event)).total
    let given = (await computeScoreGivenByUserAndEntry(entry, event)).total

    entry.set('feedback_score', computeFeedbackScore(received, given))
    await entry.save()
  }
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
