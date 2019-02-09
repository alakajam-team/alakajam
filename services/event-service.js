'use strict'

/**
 * Service for interacting with events & entries.
 *
 * @module services/event-service
 */

const config = require('../config')
const enums = require('../core/enums')
const db = require('../core/db')
const models = require('../core/models')
const constants = require('../core/constants')
const cache = require('../core/cache')
const postService = require('./post-service')
const securityService = require('./security-service')
const settingService = require('./setting-service')

module.exports = {
  createEvent,
  areSubmissionsAllowed,
  getDefaultDivision,
  findEventById,
  findEventByName,
  findEventByStatus,
  findEvents,

  createEventTemplate,
  findEventTemplates,
  findEventTemplateById,
  deleteEventTemplate,

  createEventPreset,
  findEventPresets,
  findEventPresetById,
  deleteEventPreset,

  createEntry,
  searchForTeamMembers,
  findTeamMembers,
  setTeamMembers,
  acceptInvite,
  deleteInvite,
  searchForExternalEvents,
  deleteEntry,

  findGames,
  findLatestEntries,
  findEntryById,
  findLatestUserEntry,
  findUserEntries,
  findUserEntryForEvent,
  findEntryInvitesForUser,
  findRescueEntries,
  countEntriesByEvent,

  refreshCommentKarma,
  refreshEventReferences,
  refreshEntryPlatforms,
  refreshUserCommentKarmaOnNode,
  refreshEventCounts
}

/**
 * Creates a new empty event
 * @param {EventTemplate} template An optional template to initialize the event with
 * @return {Event}
 */
function createEvent (template = null) {
  const event = new models.Event({
    'status': enums.EVENT.STATUS.PENDING,
    'status_rules': enums.EVENT.STATUS_RULES.OFF,
    'status_theme': enums.EVENT.STATUS_THEME.DISABLED,
    'status_entry': enums.EVENT.STATUS_ENTRY.OFF,
    'status_results': enums.EVENT.STATUS_RESULTS.DISABLED,
    'status_tournament': enums.EVENT.STATUS_TOURNAMENT.DISABLED,
    'divisions': {
      'solo': '48 hours<br />Everything from scratch',
      'team': '48 hours<br />Everything from scratch',
      'unranked': '72 hours<br />No rankings, just feedback'
    }
  })
  if (template) {
    event.set({
      'title': template.get('event_title'),
      'event_preset_id': template.get('event_preset_id'),
      'divisions': template.get('divisions') || event.get('divisions')
    })
    const details = event.related('details')
    details.set({
      'links': template.get('links'),
      'category_titles': template.get('category_titles')
    })
  }
  return event
}

function areSubmissionsAllowed (event) {
  return event && event.get('status') === enums.EVENT.STATUS.OPEN &&
      ([enums.EVENT.STATUS_ENTRY.OPEN, enums.EVENT.STATUS_ENTRY.OPEN_UNRANKED].includes(event.get('status_entry')))
}

function getDefaultDivision (event) {
  return Object.keys(event.get('divisions'))[0]
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
 * @param {object} options Allowed: status name sortDatesAscending
 * @returns {array(Event)}
 */
async function findEvents (options = {}) {
  let query = models.Event.forge()
    .orderBy('started_at', options.sortDatesAscending ? 'ASC' : 'DESC')
  if (options.status) query = query.where('status', options.status)
  if (options.statusNot) query = query.where('status', '<>', options.statusNot)
  if (options.name) query = query.where('name', options.name)
  if (options.pageSize) {
    return query.fetchPage(options)
  } else {
    return query.fetchAll(options)
  }
}

/**
 * Fetches the currently live models.Event.
 * @param globalStatus {string} One of "pending", "open", "closed"
 * @returns {Event} The earliest pending event OR the currently open event OR the last closed event.
 */
async function findEventByStatus (status) {
  let sortOrder = 'ASC'
  if (status === enums.EVENT.STATUS.CLOSED) {
    sortOrder = 'DESC'
  }
  return models.Event.where('status', status)
    .orderBy('started_at', sortOrder)
    .fetch()
}

/**
 * Creates an empty, unpersisted event template.
 */
function createEventTemplate () {
  return new models.EventTemplate()
}

/**
 * Finds all event templates.
 */
async function findEventTemplates () {
  return models.EventTemplate
    .forge()
    .orderBy('title')
    .fetchAll()
}

/**
 * Finds an event template.
 * @param {number} id
 */
async function findEventTemplateById (id) {
  return models.EventTemplate.where({ id }).fetch()
}

/**
 * Deletes an event template.
 * @param {EventTemplate} eventTemplate
 */
async function deleteEventTemplate (eventTemplate) {
  return eventTemplate.destroy()
}

/**
 * Creates an empty, unpersisted event preset.
 * @param {EventPreset} referencePreset Optional reference preset to clone data from
 */
function createEventPreset (referencePreset = null) {
  let eventPreset = new models.EventPreset({
    countdown_config: { date: new Date(0) }
  })
  if (referencePreset) {
    let overrideAttributes = {
      id: null,
      title: (referencePreset.get('title') || '') + ' (copy)'
    }
    eventPreset.set('countdown_config',
      Object.assign({}, referencePreset.get('countdown_config'), eventPreset.get('countdown_config')))
    eventPreset.set(Object.assign({}, referencePreset.attributes, overrideAttributes))
  }
  return eventPreset
}

/**
 * Finds all event presets.
 */
async function findEventPresets () {
  return models.EventPreset
    .forge()
    .orderBy('title')
    .fetchAll()
}

/**
 * Finds an event preset.
 * @param {number} id
 */
async function findEventPresetById (id) {
  return models.EventPreset
    .where({ id })
    .fetch({ withRelated: ['events'] })
}

/**
 * Deletes an event preset after making sure no event is currently using it.
 * @param {EventPreset} eventPreset
 */
async function deleteEventPreset (eventPreset) {
  await eventPreset.load('events')
  let eventsUsingPreset = eventPreset.related('events').length
  if (eventsUsingPreset > 0) {
    throw new Error(`Cannot delete preset ${eventPreset.get('title')} because ${eventsUsingPreset} events depend on it`)
  } else {
    return eventPreset.destroy()
  }
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

  // Attach posts from same event
  let posts = await postService.findPosts({
    eventId: event.get('id'),
    specialPostType: null
  })
  posts.each(async function (post) {
    post.set('entry_id', entry.get('id'))
    await post.save()
  })

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
    .select('user.id', 'user.title', 'user.avatar', 'entered.node_id')
    .from('user')
    .leftJoin(alreadyEntered.as('entered'), 'user.id', '=', 'entered.user_id')
    .where('name', (config.DB_TYPE === 'postgresql') ? 'ILIKE' : 'LIKE', `%${nameFragment}%`)
}

async function findTeamMembers (entry, user = null) {
  if (entry && entry.get('id')) {
    await entry.load(['invites.invited', 'userRoles.user'])
    let members = entry.sortedUserRoles()
      .map(role => ({
        id: role.get('user_id'),
        text: role.get('user_title') || role.get('user_name'),
        avatar: role.related('user').get('avatar'),
        locked: role.get('permission') === constants.PERMISSION_MANAGE,
        invite: false
      }))

    entry.related('invites').each(invite => {
      members.push({
        id: invite.get('invited_user_id'),
        text: invite.get('invited_user_title'),
        avatar: invite.related('invited').get('avatar'),
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
      avatar: user.get('avatar'),
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
    let entryId = entry.get('id')

    if (entry.get('division') === enums.DIVISION.SOLO) {
      // Force only keeping the owner role
      numRemoved = await transaction('user_role')
        .whereNot('permission', constants.PERMISSION_MANAGE)
        .andWhere({
          node_type: 'entry',
          node_id: entryId
        })
        .del()

      // Delete any pending invites
      await transaction('entry_invite')
        .where('entry_id', entryId)
        .del()
    } else {
      // Remove users not in team list.
      numRemoved = await transaction('user_role')
        .whereNotIn('user_id', userIds)
        .andWhere({
          node_type: 'entry',
          node_id: entryId
        })
        .del()

      // Remove invites not in team list
      numRemoved += await transaction('entry_invite')
        .whereNotIn('invited_user_id', userIds)
        .andWhere('entry_id', entryId)
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
          node_id: entryId
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
          entry_id: entryId,
          invited_user_id: toCreateUserRow.id,
          invited_user_title: toCreateUserRow.title || toCreateUserRow.name,
          permission: constants.PERMISSION_WRITE
        })
        await invite.save(null, { transacting: transaction })

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
  // Verify we're not on a solo entry
  if (entry.get('division') === enums.DIVISION.SOLO) {
    return deleteInvite(user, entry)
  }

  await db.transaction(async function (transaction) {
    // Check that the invite exists
    let invite = await models.EntryInvite.where({
      entry_id: entry.get('id'),
      invited_user_id: user.get('id')
    }).fetch({ transacting: transaction })

    if (invite) {
      // Check if the user role already exists
      let userRole = await models.UserRole.where({
        node_id: entry.get('id'),
        node_type: 'entry',
        user_id: user.get('id')
      }).fetch({ transacting: transaction })

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
          permission: invite.get('permission'),
          event_id: entry.get('event_id')
        })
      }

      await userRole.save(null, { transacting: transaction })
      await deleteInvite(user, entry, { transacting: transaction })
    }
  })
}

async function deleteInvite (user, entry, options = {}) {
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

  await db.transaction(async function (t) {
    // Delete user roles & comments manually (because no cascading)
    await entry.load(['userRoles.user', 'comments.user'], { transacting: t })
    entry.related('userRoles').each(function (userRole) {
      cache.user(userRole.related('user')).del('latestEntry')
      userRole.destroy({ transacting: t })
    })
    entry.related('comments').each(function (comment) {
      cache.user(comment.related('user')).del('byUserCollection')
      comment.destroy({ transacting: t })
    })

    // Delete entry
    await entry.destroy({ transacting: t })
  })
}

/**
 * @param options {object} nameFragment eventId userId platforms tags pageSize page withRelated notReviewedBy sortByRatingCount sortByRating sortByRanking
 */
async function findGames (options = {}) {
  let query = models.Entry.forge().query(function (qb) {
    return qb.leftJoin('entry_details', 'entry_details.entry_id', 'entry.id')
  })

  // Sorting
  if (!options.count) {
    if (options.sortByRatingCount) {
      query = query.query(function (qb) {
        return qb.orderBy('entry_details.rating_count')
      })
    } else if (options.sortByRating) {
      query = query.query(function (qb) {
        return qb.leftJoin('event', 'entry.event_id', 'event.id')
          .where(function () {
            this.where('event.status', enums.EVENT.STATUS.CLOSED).orWhereNull('event.status')
          })
          .orderByRaw('entry_details.rating_1 DESC ' + ((config.DB_TYPE === 'postgresql') ? 'NULLS LAST' : 'IS NOT NULL'))
          .orderBy('entry.karma', 'DESC')
      })
    } else if (options.sortByRanking) {
      query = query.query(function (qb) {
        return qb.leftJoin('event', 'entry.event_id', 'event.id')
          .where(function () {
            this.where('event.status', enums.EVENT.STATUS.CLOSED).orWhereNull('event.status')
          })
          .orderByRaw('entry_details.ranking_1 ' + ((config.DB_TYPE === 'postgresql') ? 'NULLS LAST' : 'IS NOT NULL'))
          .orderBy('entry.created_at', 'DESC')
          .orderBy('entry.division')
      })
    } else if (options.eventId !== null) {
      query = query.orderBy('entry.karma', 'DESC')
    }
    query = query.orderBy('entry.created_at', 'DESC')
  }

  // Filters
  if (options.search) query = query.where('entry.title', (config.DB_TYPE === 'postgresql') ? 'ILIKE' : 'LIKE', `%${options.search}%`)
  if (options.eventId !== undefined) query = query.where('entry.event_id', options.eventId)
  if (options.platforms) {
    query = query.query(function (qb) {
      return qb.leftJoin('entry_platform', 'entry_platform.entry_id', 'entry.id')
        .whereIn('entry_platform.platform_id', options.platforms)
        .groupBy('entry.id', 'entry_details.rating_1', 'entry.karma', 'entry.created_at',
          'entry.division', 'entry_details.ranking_1', 'entry_details.rating_count') // all order by options must appear
    })
  }
  if (options.tags) {
    query = query.query(function (qb) {
      return qb.leftJoin('entry_tag', 'entry_tag.entry_id', 'entry.id')
        .whereIn('entry_tag.tag_id', options.tags.map(tag => tag.id))
        .groupBy('entry.id', 'entry_details.rating_1', 'entry.karma', 'entry.created_at',
          'entry.division', 'entry_details.ranking_1', 'entry_details.rating_count') // all order by options must appear
    })
  }
  if (options.divisions) {
    query = query.where('division', 'in', options.divisions)
  }
  if (options.notReviewedById) {
    query = query.query(function (qb) {
      return qb
        // Hide rated
        .leftJoin('entry_vote', function () {
          this.on('entry_vote.entry_id', '=', 'entry.id')
            .andOn('entry_vote.user_id', '=', options.notReviewedById)
        })
        .whereNull('entry_vote.id')
        // Hide commented
        .where('entry.id', 'NOT IN', db.knex('comment')
          .where({
            'user_id': options.notReviewedById,
            'node_type': 'entry'
          })
          .select('node_id'))
        // Hide own entry (not strictly requested, but sensible)
        .leftJoin('user_role', function () {
          this.on('user_role.node_id', '=', 'entry.id')
            .andOn('user_role.user_id', '=', options.notReviewedById)
        })
        .whereNull('user_role.id')
    })
  }
  if (options.userId) {
    query = query.query((qb) => {
      return qb.innerJoin('user_role', 'entry.id', 'user_role.node_id')
        .where({
          'user_role.user_id': options.userId,
          'user_role.node_type': 'entry'
        })
    })
  }

  // Pagination settings
  if (options.pageSize === undefined) options.pageSize = 30
  if (options.withRelated === undefined) options.withRelated = ['event', 'userRoles']

  // Fetch
  if (options.count) {
    return query.count()
  } else if (options.pageSize) {
    return query.fetchPage(options)
  } else {
    return query.fetchAll(options)
  }
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
async function findEntryById (id, options = {}) {
  if (!options.withRelated) {
    options.withRelated = ['details', 'event', 'userRoles', 'tags']
  }
  return models.Entry.where('id', id).fetch(options)
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
  })
    .orderBy('published_at', 'desc')
    .orderBy('external_event', 'desc')
    .fetchAll({ withRelated: ['userRoles', 'event'] })

  // Move entries without a publication date to the end (otherwise nulls would be first)
  let entriesWithoutPublicationDate = entriesCollection.filter(entry => !entry.get('published_at'))
  return new db.Collection(entriesCollection
    .difference(entriesWithoutPublicationDate)
    .concat(entriesWithoutPublicationDate))
}

/**
 * Retrieves the user's latest entry
 * @param  {User} user
 * @return {Entry|null}
 */
async function findLatestUserEntry (user, options = {}) {
  if (!options.withRelated) {
    options.withRelated = ['userRoles', 'event']
  }

  return models.Entry.query((qb) => {
    qb.distinct()
      .innerJoin('user_role', 'entry.id', 'user_role.node_id')
      .whereNotNull('entry.event_id')
      .where({
        'user_role.user_id': user.get('id'),
        'user_role.node_type': 'entry'
      })
  })
    .orderBy('created_at', 'desc')
    .fetch(options)
}

/**
 * Retrieves the entry a user submitted to an event
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

async function findRescueEntries (event, user, options = {}) {
  let minRatings = parseInt(await settingService.find(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, '10'))

  if (options.pageSize === undefined) options.pageSize = 4
  if (options.withRelated === undefined) options.withRelated = ['details', 'userRoles']

  return models.Entry.where('entry.event_id', event.get('id'))
    .where('division', '<>', enums.DIVISION.UNRANKED)
    .query(function (qb) {
      return qb.leftJoin('entry_details', 'entry_details.entry_id', 'entry.id')
        .where('entry_details.rating_count', '>', Math.floor(minRatings / 4)) // do not rescue those who really didn't participate
        .where('entry_details.rating_count', '<', minRatings)
        .leftJoin('entry_vote', function () {
          this.on('entry_vote.entry_id', '=', 'entry.id')
            .andOn('entry_vote.user_id', '=', user.get('id'))
        })
        .whereNull('entry_vote.id') // hide rated games
    })
    .orderBy('entry_details.rating_count', 'desc')
    .fetchPage(options)
}

async function countEntriesByEvent (event) {
  let count = await models.Entry
    .where('event_id', event.get('id'))
    .count()
  return parseInt(count)
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

async function refreshCommentKarma (comment) {
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
    let rawScore = _computeRawCommentKarma(comment)

    let previousCommentsScore = 0
    let entryComments = entry.related('comments')
    for (let entryComment of entryComments.models) {
      if (entryComment.get('user_id') === comment.get('user_id') && entryComment.get('id') !== comment.get('id')) {
        previousCommentsScore += entryComment.get('karma')
      }
    }
    adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore))
  }

  comment.set('karma', adjustedScore)
}

/**
 * Refreshes the scores of all the comments written by an user on an entry.
 * Useful to detect side-effects of a user modifying or deleting a comment.
 * @param {integer} userId The user id of the modified comment
 * @param {Post|Entry} node
 */
async function refreshUserCommentKarmaOnNode (node, userId) {
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
          let rawScore = _computeRawCommentKarma(comment)
          adjustedScore = Math.max(0, Math.min(rawScore, 3 - previousCommentsScore))
          previousCommentsScore += adjustedScore
        }
        comment.set('karma', adjustedScore)
        await comment.save()
      }
    }
  }
}

function _computeRawCommentKarma (comment) {
  let commentLength = comment.get('body').length
  if (commentLength > 300) { // Elaborate comments
    return 3
  } else if (commentLength > 100) { // Interesting comments
    return 2
  } else { // Short comments
    return 1
  }
}

/**
 * Updates the event counters on an event
 * @param  {Event} event
 * @return {void}
 */
async function refreshEventCounts (event) {
  let countByDivision = await db.knex('entry')
    .count('* as count').select('division')
    .where('event_id', event.get('id'))
    .where('published_at', '<=', new Date())
    .groupBy('division')

  let totalCount = 0
  let divisionCounts = {}
  for (let row of countByDivision) {
    let count = parseInt(row['count'])
    divisionCounts[row['division']] = count
    totalCount += count
  }
  if (!event.relations.details) {
    await event.load('details')
  }

  return db.transaction(async function (transaction) {
    event.set('entry_count', totalCount)
    await event.save(null, { transacting: transaction })

    let details = event.related('details')
    details.set('division_counts', divisionCounts)
    await details.save(null, { transacting: transaction })

    cache.eventsById.del(event.get('id'))
    cache.eventsByName.del(event.get('name'))
  })
}
