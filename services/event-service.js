'use strict'

/**
 * Service for interacting with events & entries.
 *
 * @module services/event-service
 */

const db = require('../core/db')
const models = require('../core/models')
const constants = require('../core/constants')
const postService = require('./post-service')

module.exports = {
  createEvent,
  refreshEventReferences,

  findEventById,
  findEventByName,
  findEventByStatus,
  findEvents,

  createEntry,
  searchForTeamMembers,
  setTeamMembers,

  findLatestEntries,
  findEntryById,
  findLatestUserEntry,
  findUserEntries,
  findUserEntryForEvent,

  refreshEntryPlatforms,
  refreshEntryScore,
  refreshCommentScore,
  adjustUserCommentScore,

  areSubmissionsAllowed
}

/**
 * Creates a new empty event
 * @return {Event}
 */
function createEvent () {
  return new models.Event({
    'published_at': new Date() // TODO Let admins choose when to publish
  })
}

/**
 * Refreshes various models that cache the event name.
 * Call this after changing the name of an event.
 * @param {Event} event
 */
async function refreshEventReferences (event) {
  // TODO Transaction
  let entryCollection = await models.Entry.where('event_id', event.id).fetchAll()
  for (let entry of entryCollection.models) {
    entry.set('event_name', event.get('name'))
    await entry.save()
  }
}

/**
 * Fetches an models.Event by its ID, with all its Entries.
 * @param id {id} models.Event ID
 * @returns {Event}
 */
async function findEventById (id) {
  return models.Event.where('id', id)
    .fetch({ withRelated: ['entries', 'entries.userRoles'] })
}

/**
 * Fetches an models.Event by its name, with all its Entries.
 * @param id {id} models.Event name
 * @returns {Event}
 */
async function findEventByName (name) {
  return models.Event.where('name', name)
    .fetch({ withRelated: ['entries', 'entries.userRoles'] })
}

/**
 * Fetches all models.Events and their Entries.
 * @param {object} options Allowed: status name
 * @returns {array(Event)}
 */
async function findEvents (options = {}) {
  let query = await new models.Event()
  query.orderBy('published_at', options.sortDatesAscending ? 'ASC' : 'DESC')
  if (options.status) query = query.where('status', options.status)
  if (options.name) query = query.where('name', options.name)
  return query.fetchAll({ withRelated: ['entries'] })
}

/**
 * Fetches the currently live models.Event.
 * @param globalStatus {string} One of "pending", "open", "closed"
 * @returns {Event} The earliest pending event OR the currently open event OR the last closed event.
 */
async function findEventByStatus (status) {
  let sortOrder = 'ASC'
  if (status === 'closed') {
    sortOrder = 'DESC'
  }
  return models.Event.where('status', status)
    .orderBy('published_at', sortOrder)
    .fetch()
}

/**
 * Creates and persists a new entry, initializing the owner UserRole.
 * @param  {User} user
 * @param  {Event} event
 * @return {Entry}
 */
async function createEntry (user, event) {
  const eventId = event.get('id')
  if (await findUserEntryForEvent(user, eventId)) {
    throw new Error('User already has an entry for this event')
  }

  // TODO Better use of Bookshelf API
  let entry = new models.Entry()
  await entry.save() // otherwise the user role won't have a node_id
  entry.set('event_id', eventId)
  entry.set('event_name', event.get('name'))
  await entry.userRoles().create({
    user_id: user.get('id'),
    user_name: user.get('name'),
    user_title: user.get('title'),
    event_id: eventId,
    permission: constants.PERMISSION_MANAGE
  })

  let entryDetails = new models.EntryDetails({
    entry_id: entry.get('id')
  })
  await entryDetails.save()
  await entry.load('details')

  return entry
}

/**
 * @typedef TeamMemberSearchResult
 * @prop {string} name the user's name.
 * @prop {string} title the user's title.
 * @prop {number|null} node_id the entry ID if entered; otherwise `null`.
 * @prop {number|null} event_id the event ID if entered; otherwise `null`.
 */
/**
 * Search for potential team members by name.
 * @param {Object} options
 * @param {string} options.nameFragment the name search string.
 * @param {number} options.eventId the event ID.
 * @returns {TeamMemberSearchResult[]}
 */
function searchForTeamMembers ({nameFragment, eventId}) {
  // As SQL:
  // SELECT "user".name, "user".title, entered.event_id
  // FROM "user"
  // LEFT JOIN (
  //   SELECT user_id, event_id, node_type FROM user_role
  //   WHERE node_type = 'entry' AND event_id = ${eventId}
  // ) entered
  // ON "user".id = entered.user_id;
  const alreadyEntered = db.knex('user_role')
    .select('user_id', 'event_id', 'node_type', 'node_id')
    .where({  // entered in this event...
      node_type: 'entry',
      event_id: eventId
    })

  return db.knex
    .select('user.name', 'user.title', 'entered.event_id', 'entered.node_id')
    .from('user')
    .leftJoin(alreadyEntered.as('entered'), 'user.id', '=', 'entered.user_id')
    .where('name', 'ILIKE', `%${nameFragment}%`)
}

/**
 * @typedef UserEntryData
 * @prop {string} user_name the user's username.
 * @prop {string} user_title the user's title.
 * @prop {number} node_id the ID of the user's entry.
 */
/**
 * @typedef SetTeamMembersResult
 * @property {number} numRemoved the number of removed user roles.
 * @property {number} numAdded the number of added user roles.
 * @property {UserEntryData[]} alreadyEntered details of users already entered.
 */
/**
 * Sets the team members of an entry.
 * @param {Bookshelf.Model} entry the entry model.
 * @param {Bookshelf.Model} event the event model.
 * @param {string[]} names the member user names.
 * @returns {Promise<SetTeamMembersResult>} the result of this operation.
 */
function setTeamMembers ({entry, event, names}) {
  return db.transaction(async function (transaction) {
    // Remove users not in names list.
    const numRemoved = await transaction('user_role')
      .whereNotIn('user_name', names)
      .andWhere({
        node_type: 'entry',
        node_id: entry.id
      })
      .del()

    // List users from `names` who entered the event in this or another team.
    const alreadyEntered = await transaction('user_role')
      .select('user_name', 'user_title', 'node_id')
      .whereIn('user_name', names)
      .andWhere({
        node_type: 'entry',
        event_id: event.id
      })

    // Remove names of users who are already entered.
    const enteredNames = alreadyEntered.map(obj => obj.user_name)
    names = names.filter(name => !enteredNames.includes(name))

    // Create new roles for all remaining named users.
    const toCreateUserData = await transaction('user')
      .select('id', 'name', 'title')
      .whereIn('name', names)
    const now = transaction.fn.now()
    const newRoles = toCreateUserData.map(user => ({
      user_id: user.id,
      user_name: user.name,
      user_title: user.title,
      node_id: entry.id,
      node_type: 'entry',
      permission: constants.PERMISSION_WRITE,  // The owner already has a role.
      created_at: now,
      updated_at: now,
      event_id: event.id
    }))
    await transaction('user_role').insert(newRoles)

    return {
      numRemoved,
      numAdded: newRoles.length,
      alreadyEntered
    }
  })
}

/**
 * Fetches the latest entries of any event
 * @param id {id} models.Entry ID
 * @returns {Entry}
 */
async function findLatestEntries () {
  return models.Entry.forge()
    .orderBy('created_at', 'DESC')
    .fetchPage({
      pageSize: 4,
      withRelated: ['userRoles', 'event']
    })
}

/**
 * Fetches an models.Entry by its ID.
 * @param id {id} models.Entry ID
 * @returns {Entry}
 */
async function findEntryById (id) {
  return models.Entry.where('id', id)
    .fetch({ withRelated: ['details', 'event', 'userRoles'] })
}

/**
 * Retrieves all the entries an user contributed to
 * @param  {User} user
 * @return {array(Entry)|null}
 */
async function findUserEntries (user) {
  let entryCollection = await models.Entry.query((qb) => {
    qb.distinct()
      .innerJoin('user_role', 'entry.id', 'user_role.node_id')
      .where({
        'user_role.user_id': user.get('id'),
        'user_role.node_type': 'entry'
      })
  }).fetchAll({ withRelated: ['userRoles', 'event'] })
  return entryCollection.models
}

/**
 * Retrieves the user's latest entry
 * @param  {User} user
 * @return {Entry|null}
 */
async function findLatestUserEntry (user) {
  let entryCollection = await models.Entry.query((qb) => {
    qb.distinct()
      .innerJoin('user_role', 'entry.id', 'user_role.node_id')
      .where({
        'user_role.user_id': user.get('id'),
        'user_role.node_type': 'entry'
      })
  }).orderBy('created_at', 'desc')
  .fetchAll({ withRelated: ['userRoles', 'event'] })
  return entryCollection.models[0]
}

/**
 * Retrieves the entry a user submited to an event
 * @param  {User} user
 * @param  {integer} eventId
 * @return {Entry|null}
 */
async function findUserEntryForEvent (user, eventId) {
  return models.Entry.query((query) => {
    query.innerJoin('user_role', 'entry.id', 'user_role.node_id')
      .where({
        'entry.event_id': eventId,
        'user_role.user_id': user.get('id'),
        'user_role.node_type': 'entry'
      })
  }).fetch({ withRelated: ['userRoles'] })
}

async function refreshEntryPlatforms (entry) {
  let tasks = []
  await entry.load('platforms')
  entry.related('platforms').each(async function (entry) {
    tasks.push(entry.destroy())
  })
  let platformStrings = entry.get('platforms')
  if (platformStrings) {
    for (let platformString of platformStrings) {
      let platform = new models.EntryPlatform({
        entry_id: entry.get('id'),
        platform: platformString
      })
      tasks.push(platform.save())
    }
  }
  await Promise.all(tasks)
}

async function refreshEntryScore (entry) {
  await entry.load(['comments', 'userRoles'])

  let received = 0
  let comments = entry.related('comments')
  for (let comment of comments.models) {
    received += comment.get('feedback_score')
  }

  let given = 0
  let userRoles = entry.related('userRoles')
  for (let userRole of userRoles.models) {
    let givenComments = await postService.findCommentsByUserAndEvent(userRole.get('user_id'), entry.get('event_id'))
    for (let givenComment of givenComments.models) {
      given += givenComment.get('feedback_score')
    }
  }

  // This formula boosts a little bit low scores (< 30) to ensure everybody gets at least some comments,
  // and to reward people for posting their first comments. It also nerfs & caps very active commenters to prevent
  // them from trusting the front page. Finally, negative scores are not cool so we use 100 as the origin.
  // NB. It is inspired by the actual LD sorting equation: D = 50 + R - 5*sqrt(min(C,100))
  // (except that here, higher is better)
  entry.set('feedback_score', Math.floor(Math.max(0, 74 + 8.5 * Math.sqrt(10 + Math.min(given, 100)) - received)))
  await entry.save()
}

async function refreshCommentScore (comment) {
  await comment.load(['node.comments', 'node.userRoles'])

  let isTeamMember = 0
  let entry = comment.related('node')
  let entryUserRoles = entry.related('userRoles')
  for (let userRole of entryUserRoles.models) {
    if (userRole.get('user_id') === comment.get('user_id')) {
      isTeamMember = true
      break
    }
  }

  let adjustedScore = 0
  if (!isTeamMember) {
    let rawScore = _computeRawCommentScore(comment)

    let previousCommentsScore = 0
    let entryComments = entry.related('comments')
    for (let entryComment of entryComments.models) {
      if (entryComment.get('user_id') === comment.get('user_id') && entryComment.get('id') !== comment.get('id')) {
        previousCommentsScore += entryComment.get('feedback_score')
      }
    }
    adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore))
  }

  comment.set('feedback_score', adjustedScore)
}

/**
 * Adjust the value of each comments of a user after a deletion
 * @param {integer} userId The user id of the modified comment
 * @param {Post|Entry} node The current node model
 */
async function adjustUserCommentScore (userId, entry) {
  await entry.load(['comments', 'userRoles'])
  let isTeamMember = 0

  let entryUserRoles = entry.related('userRoles')
  for (let userRole of entryUserRoles.models) {
    if (userRole.get('user_id') === userId) {
      isTeamMember = true
      break
    }
  }
  if (!isTeamMember) {
    let previousCommentsScore = 0
    let entryComments = entry.related('comments')
    for (let comment of entryComments.models) {
      if (comment.get('user_id') === userId) {
        let adjustedScore = 0
        if (previousCommentsScore < 3) {
          let rawScore = _computeRawCommentScore(comment)
          adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore))
          previousCommentsScore += adjustedScore
        }
        comment.set('feedback_score', adjustedScore)
        await comment.save()
      }
    }
  }
}

function _computeRawCommentScore (comment) {
  let commentLength = comment.get('body').length
  if (commentLength > 300) { // Elaborate comments
    return 3
  } else if (commentLength > 100) { // Interesting comments
    return 2
  } else { // Short comments
    return 1
  }
}

function areSubmissionsAllowed (event) {
  return event && event.get('status') === 'open' && event.get('status_entry') === 'on'
}
