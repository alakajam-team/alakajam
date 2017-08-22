'use strict'

/**
 * Service for managing games ratings & rankings.
 *
 * @module services/event-rating-service
 */

const models = require('../core/models')
const constants = require('../core/constants')
const eventService = require('../services/event-service')

module.exports = {
  canVoteOnEntry,

  findEntryVote,
  saveEntryVote,

  refreshEntryRatings
}

/**
 * Checks whether a user can vote on an entry
 * @param  {User} user
 * @param  {Entry} entry
 * @return {void}
 */
async function canVoteOnEntry (user, entry) {
  let userEntry = await eventService.findUserEntryForEvent(user, entry.get('event_id'))
  return userEntry && userEntry.get('id') !== entry.get('id')
}

/**
 * Find the votes an user cast on an entry
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
 * @param  {array[number]} voteData
 * @return {void}
 */
async function saveEntryVote (user, entry, voteData) {
  if (!(await canVoteOnEntry(user, entry))) {
    throw new Error('user cannot vote on this entry')
  }

  await entry.load('event.details')
  let event = entry.related('event')
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
  for (let i in voteData) {
    let categoryIndex = (parseInt(i) + 1)
    vote.set('vote_' + categoryIndex, voteData[i])
  }
  await vote.save()

  await refreshEntryRatings(entry)
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
  for (let categoryIndex of categoryIndexes) {
    let averageRating
    if (ratingCount[categoryIndex] >= constants.MINIMUM_REQUIRED_RATINGS) {
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
