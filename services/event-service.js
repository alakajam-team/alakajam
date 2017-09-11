'use strict'

/**
 * Service for interacting with events & entries.
 *
 * @module services/event-service
 */

const config = require('../config')
const db = require('../core/db')
const models = require('../core/models')
const constants = require('../core/constants')
const cache = require('../core/cache')
const postService = require('./post-service')
const securityService = require('./security-service')

module.exports = {
  createEvent,
  refreshEventReferences,
  areSubmissionsAllowed,

  findEventById,
  findEventByName,
  findEventByStatus,
  findEvents,

  createEntry,
  searchForTeamMembers,
  findTeamMembers,
  setTeamMembers,
  acceptInvite,
  deleteInvite,
  searchForExternalEvents,
  deleteEntry,

  findLatestEntries,
  findEntryById,
  findLatestUserEntry,
  findUserEntries,
  findUserEntryForEvent,
  findEntryInvitesForUser,
  countEntriesByEvent,
  findGames,

  refreshEntryScore,
  refreshCommentScore,
  refreshEntryPlatforms,
  refreshUserCommentScoresOnNode
}

/**
 * Creates a new empty event
 * @return {Event}
 */
function createEvent () {
  return new models.Event({
    'status': 'pending',
    'status_rules': 'disabled',
    'status_theme': 'disabled',
    'status_entry': 'off',
    'status_results': 'disabled',
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

function areSubmissionsAllowed (event) {
  return event && event.get('status') === 'open' &&
      (event.get('status_entry') === 'open' || event.get('status_entry') === 'open_unranked')
}

/**
 * Fetches an models.Event by its ID, with all its Entries.
 * @param id {id} models.Event ID
 * @returns {Event}
 */
async function findEventById (id) {
  if (!cache.eventsById.get(id)) {
    let event = await models.Event.where('id', id)
        .fetch({ withRelated: ['details'] })
    cache.eventsById.set(id, event)
  }
  return cache.eventsById.get(id)
}

/**
 * Fetches an models.Event by its name, with all its Entries.
 * @param id {id} models.Event name
 * @returns {Event}
 */
async function findEventByName (name) {
  if (!cache.eventsByName.get(name)) {
    let event = await models.Event.where('name', name)
        .fetch({ withRelated: ['details'] })
    cache.eventsByName.set(name, event)
  }
  return cache.eventsByName.get(name)
}

/**
 * Fetches all models.Events and their Entries.
 * @param {object} options Allowed: status name
 * @returns {array(Event)}
 */
async function findEvents (options = {}) {
  let query = models.Event.forge()
    .orderBy('published_at', options.sortDatesAscending ? 'ASC' : 'DESC')
  if (options.status) query = query.where('status', options.status)
  if (options.name) query = query.where('name', options.name)
  return query.fetchAll()
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
  let entry = new models.Entry({
    'name': 'untitled',
    'title': '',
    'comment_count': 0
  })

  if (event) {
    const eventId = event.get('id')
    if (await findUserEntryForEvent(user, eventId)) {
      throw new Error('User already has an entry for this event')
    }
    entry.set({
      'event_id': eventId,
      'event_name': event.get('name')
    })
  }

  await entry.save() // otherwise the user role won't have a node_id
  await entry.userRoles().create({
    user_id: user.get('id'),
    user_name: user.get('name'),
    user_title: user.get('title'),
    event_id: event ? event.get('id') : null,
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
 * @prop {number} id user's id.
 * @prop {string} title the user's title.
 * @prop {number|null} node_id the entry ID if entered; otherwise `null`.
 * @prop {number|null} event_id the event ID if entered; otherwise `null`.
 */
/**
 * Search for potential team members by name.
 * @param {string} nameFragment the name search string.
 * @param {number} eventId the event ID (optional, null if an external event).
 * @param {Entry} entry the entry model (optional, null if we're in a creation).
 * @returns {TeamMemberSearchResult[]}
 */
function searchForTeamMembers (nameFragment, eventId, entry) {
  // As SQL:
  // SELECT "user".name, "user".title, entered.node_id
  // FROM "user"
  // LEFT JOIN (
  //   SELECT user_id, event_id, node_type FROM user_role
  //   WHERE node_type = 'entry' AND event_id = ${eventId}
  // ) entered
  // ON "user".id = entered.user_id;

  let alreadyEnteredWhereClause = {
    node_type: 'entry'
  }
  if (eventId) {
    // general case: detect people who entered in the same event
    alreadyEnteredWhereClause.event_id = eventId
  } else {
    // external entries: detect people in the same entry
    // (or everyone if the entry is not created yet)
    alreadyEnteredWhereClause.node_id = entry ? entry.get('id') : -1
  }

  const alreadyEntered = db.knex('user_role')
    .select('user_id', 'event_id', 'node_id')
    .where(alreadyEnteredWhereClause)

  return db.knex
    .select('user.id', 'user.title', 'entered.node_id')
    .from('user')
    .leftJoin(alreadyEntered.as('entered'), 'user.id', '=', 'entered.user_id')
    .where('name', (config.DB_TYPE === 'postgresql') ? 'ILIKE' : 'LIKE', `%${nameFragment}%`)
}

async function findTeamMembers (entry, user = null) {
  if (entry && entry.get('id')) {
    let members = entry.sortedUserRoles()
      .map(role => ({
        id: role.get('user_id'),
        text: role.get('user_title') || role.get('user_name'),
        locked: role.get('permission') === constants.PERMISSION_MANAGE,
        invite: false
      }))

    await entry.load('invites')
    entry.related('invites').each(invite => {
      members.push({
        id: invite.get('invited_user_id'),
        text: invite.get('invited_user_title'),
        locked: false,
        invite: true
      })
    })
    return members
  } else {
    // New entry: only the current user is a member
    return [{
      id: user.get('id'),
      text: user.get('title'),
      locked: true,
      invite: false
    }]
  }
}

/**
 * @typedef UserEntryData
 * @prop {string} user_id the user ID.
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
 * @param {Bookshelf.Model} currentUser the current user model.
 * @param {Bookshelf.Model} entry the entry model.
 * @param {string[]} userIds the desired member user IDs.
 * @returns {Promise<SetTeamMembersResult>} the result of this operation.
 */
function setTeamMembers (currentUser, entry, userIds) {
  return db.transaction(async function (transaction) {
    let numRemoved = 0
    let numAdded = 0
    let alreadyEntered = []

    if (entry.get('division') === 'solo') {
      // Force only keeping the owner role
      numRemoved = await transaction('user_role')
        .whereNot('permission', constants.PERMISSION_MANAGE)
        .andWhere({
          node_type: 'entry',
          node_id: entry.id
        })
        .del()
    } else {
      // Remove users not in team list.
      numRemoved = await transaction('user_role')
        .whereNotIn('user_id', userIds)
        .andWhere({
          node_type: 'entry',
          node_id: entry.id
        })
        .del()

      // Remove invites not in team list
      numRemoved += await transaction('entry_invite')
        .whereNotIn('invited_user_id', userIds)
        .andWhere('entry_id', entry.id)
        .del()

      // List users who entered the event in this or another team, or already have an invite.
      let existingRolesQuery = transaction('user_role')
          .select('user_id', 'user_title', 'node_id')
          .whereIn('user_id', userIds)
      if (entry.get('event_id')) {
        alreadyEntered = await existingRolesQuery.andWhere({
          node_type: 'entry',
          event_id: entry.get('event_id')
        })
      } else {
        alreadyEntered = await existingRolesQuery.andWhere({
          node_type: 'entry',
          node_id: entry.id
        })
      }
      if (entry.get('id')) {
        let pendingInvites = await transaction('entry_invite')
            .select('invited_user_id', 'invited_user_title')
            .whereIn('invited_user_id', userIds)
            .where('entry_id', entry.get('id'))
        pendingInvites.map(pendingInvite => {
          alreadyEntered.push({
            user_id: pendingInvite.invited_user_id,
            user_title: pendingInvite.invited_user_title,
            node_id: entry.get('id')
          })
        })
      }

      // Remove names of users who are already entered.
      const enteredUserIds = alreadyEntered.map(obj => obj.user_id)
      userIds = userIds.filter(userId => !enteredUserIds.includes(userId))

      // Create invites for all remaining named users.
      // (accept it directly if we're setting the current user)
      const toCreateUserData = await transaction('user')
        .select('id', 'name', 'title')
        .whereIn('id', userIds)
      for (let toCreateUserRow of toCreateUserData) {
        let invite = new models.EntryInvite({
          entry_id: entry.id,
          invited_user_id: toCreateUserRow.id,
          invited_user_title: toCreateUserRow.title || toCreateUserRow.name,
          permission: constants.PERMISSION_WRITE
        })
        await invite.save()

        if (toCreateUserRow.id === currentUser.get('id')) {
          acceptInvite(currentUser, entry)
        } else {
          numAdded++
          cache.user(toCreateUserRow.name).del('unreadNotifications')
        }
      }
    }

    return {
      numRemoved,
      numAdded,
      alreadyEntered
    }
  })
}

async function acceptInvite (user, entry) {
  await db.transaction(async function (transaction) {
    // Check that the invite exists
    let invite = await models.EntryInvite.where({
      entry_id: entry.get('id'),
      invited_user_id: user.get('id')
    }).fetch()

    if (invite) {
      // Check if the user role exists yet
      let userRole = await models.UserRole.where({
        node_id: entry.get('id'),
        node_type: 'entry',
        user_id: user.get('id')
      }).fetch()

      // Create or promote role
      if (userRole) {
        let isInviteForHigherPermission = securityService.getPermissionsEqualOrAbove(userRole.get('permission'))
          .includes(invite.get('permission'))
        if (isInviteForHigherPermission) {
          userRole.set('permission', invite.get('permission'))
        }
      } else {
        // Clear any other invites from the same event
        if (entry.get('event_id')) {
          let inviteIds = await transaction('entry_invite')
            .select('entry_invite.id')
            .leftJoin('entry', 'entry.id', 'entry_invite.entry_id')
            .where({
              'entry_invite.invited_user_id': user.get('id'),
              'entry.event_id': entry.get('event_id')
            })
          await transaction('entry_invite')
            .whereIn('id', inviteIds.map(row => row.id))
            .del()
        }

        userRole = new models.UserRole({
          user_id: user.get('id'),
          user_name: user.get('name'),
          user_title: user.get('title'),
          node_id: entry.get('id'),
          node_type: 'entry',
          permission: invite.get('permission')
        })
      }

      await userRole.save(null, { transacting: transaction })
      await deleteInvite(user, entry, { transacting: transaction })
    }
  })
}

async function deleteInvite (user, entry, options) {
  let query = db.knex('entry_invite')
  if (options.transacting) {
    query = query.transacting(options.transacting)
  }
  await query.where({
    entry_id: entry.get('id'),
    invited_user_id: user.get('id')
  })
    .del()
}

/**
 * Searches for any external event name already submitted
 * @param  {string} nameFragment
 * @return {array(string)} external event names
 */
async function searchForExternalEvents (nameFragment) {
  let results = await db.knex('entry')
    .distinct()
    .select('external_event')
    .where('external_event', (config.DB_TYPE === 'postgresql') ? 'ILIKE' : 'LIKE', `%${nameFragment}%`)

  let formattedResults = []
  for (let result of results) {
    formattedResults.push(result.external_event)
  }
  formattedResults.sort(function (a, b) {
    return a.localeCompare(b)
  })
  return formattedResults
}

async function deleteEntry (entry) {
  // Unlink posts (not in transaction to prevent foreign key errors)
  let posts = await postService.findPosts({ entryId: entry.get('id') })
  posts.each(async function (post) {
    post.set('entry_id', null)
    await post.save()
  })

  return db.transaction(async function (t) {
    // Delete user roles manually (because no cascading)
    await entry.load('userRoles')
    entry.related('userRoles').each(function (userRole) {
      userRole.destroy({ transacting: t })
    })

    // Delete entry
    await entry.destroy({ transacting: t })
  })
}

/**
 * Fetches the latest entries of any event
 * @param id {id} models.Entry ID
 * @returns {Entry}
 */
async function findLatestEntries () {
  return models.Entry.query((qb) => {
    return qb.whereNotNull('event_id')
  })
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
  let entriesCollection = await models.Entry.query((qb) => {
    qb.distinct()
      .innerJoin('user_role', 'entry.id', 'user_role.node_id')
      .where({
        'user_role.user_id': user.get('id'),
        'user_role.node_type': 'entry'
      })
  }).fetchAll({ withRelated: ['userRoles', 'event'] })

  entriesCollection.models.sort(function (a, b) {
    // Sort by most recent event first, then external entries sorted by event name
    // TODO Sort by publication date
    if (a.get('event_id')) {
      if (b.get('event_id')) {
        return a.get('created_at') - b.get('created_at')
      } else {
        return -1
      }
    } else {
      if (b.get('event_id')) {
        return 1
      } else {
        return (b.get('external_event') || '').localeCompare(a.get('external_event'))
      }
    }
  })

  return entriesCollection
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
      .whereNotNull('entry.event_id')
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

async function findEntryInvitesForUser (user, options) {
  let notificationsLastRead = new Date(0)
  if (options.notificationsLastRead && user.get('notifications_last_read') !== undefined) {
    notificationsLastRead = new Date(user.get('notifications_last_read'))
  }

  return models.EntryInvite
    .where('invited_user_id', user.get('id'))
    .where('created_at', '>', notificationsLastRead)
    .fetchAll(options)
}

async function countEntriesByEvent (event) {
  let count = await models.Entry
    .where('event_id', event.get('id'))
    .count()
  return parseInt(count)
}

/**
 * @param options {object} nameFragment eventId platforms pageSize page withRelated
 */
async function findGames (options = {}) {
  let query = models.Entry.forge()
  if (!options.count) {
    if (options.sortByScore) {
      query = query.orderBy('feedback_score', 'DESC')
    }
    query = query.orderBy('created_at', 'DESC')
  }
  if (options.search) query = query.where('title', (config.DB_TYPE === 'postgresql') ? 'ILIKE' : 'LIKE', `%${options.search}%`)
  if (options.eventId !== undefined) query = query.where('event_id', options.eventId)
  if (options.platforms) {
    query = query.query(function (qb) {
      return qb.leftJoin('entry_platform', 'entry_platform.entry_id', 'entry.id')
        .whereIn('entry_platform.platform_id', options.platforms)
    })
  }
  options.pageSize = options.pageSize || 30
  options.withRelated = options.withRelated || ['event', 'userRoles']
  if (options.count) {
    return query.count()
  } else {
    return query.fetchPage(options)
  }
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

/**
 *
 * @param  {Entry} entry
 * @return {void}
 */
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
 * Refreshes the scores of all the comments written by an user on an entry.
 * Useful to detect side-effects of a user modifying or deleting a comment.
 * @param {integer} userId The user id of the modified comment
 * @param {Post|Entry} node
 */
async function refreshUserCommentScoresOnNode (node, userId) {
  await node.load(['comments', 'userRoles'])
  let isTeamMember = 0

  let entryUserRoles = node.related('userRoles')
  for (let userRole of entryUserRoles.models) {
    if (userRole.get('user_id') === userId) {
      isTeamMember = true
      break
    }
  }

  if (!isTeamMember) {
    let previousCommentsScore = 0
    let entryComments = node.related('comments')
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
