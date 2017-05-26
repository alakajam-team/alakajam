'use strict'

/**
 * Service for interacting with events & entries.
 *
 * @module services/event-service
 */

const Event = require('../models/event-model')
const Entry = require('../models/entry-model')
const constants = require('../core/constants')

module.exports = {
  findEventById,
  findEventByName,
  findAllEvents,
  findEventByStatus,

  createEntry,
  findEntryById,
  findUserEntries,
  findUserEntryForEvent
}

/**
 * Fetches an Event by its ID, with all its Entries.
 * @param id {id} Event ID
 * @returns {Event}
 */
async function findEventById (id) {
  return Event.where('id', id)
    .fetch({ withRelated: ['entries', 'entries.userRoles'] })
}

/**
 * Fetches an Event by its name, with all its Entries.
 * @param id {id} Event name
 * @returns {Event}
 */
async function findEventByName (name) {
  return Event.where('name', name)
    .fetch({ withRelated: ['entries', 'entries.userRoles'] })
}

/**
 * Fetches all Events and their Entries.
 * @returns {array(Event)}
 */
async function findAllEvents () {
  let eventModels = await new Event()
    .orderBy('title', 'DESC') // XXX Temporary prop
    .fetchAll({ withRelated: ['entries'] })
  return eventModels.models
}

/**
 * Fetches the currently live Event.
 * @param globalStatus {string} One of "pending", "open", "closed"
 * @returns {Event} The earliest pending event OR the currently open event OR the last closed event.
 */
async function findEventByStatus (status) {
  let sortOrder = 'ASC'
  if (status === 'closed') {
    sortOrder = 'DESC'
  }
  return Event.where('status', status)
    .orderBy('title', sortOrder) // XXX Temporary prop
    .fetch()
}

/**
 * Creates and persists a new entry, initializing the owner UserRole.
 * @param  {User} user
 * @param  {Event} event
 * @return {Entry}
 */
async function createEntry (user, event) {
  // TODO Better use of Bookshelf API
  let entry = new Entry()
  await entry.save() // otherwise the user role won't have a node_id
  entry.set('event_id', event.get('id'))
  entry.set('event_name', event.get('name'))
  await entry.userRoles().create({
    user_id: user.get('id'),
    user_name: user.get('name'),
    user_title: user.get('title'),
    permission: constants.PERMISSION_MANAGE
  })
  return entry
}

/**
 * Fetches an Entry by its ID.
 * @param id {id} Entry ID
 * @returns {Entry}
 */
async function findEntryById (id) {
  return Entry.where('id', id).fetch({ withRelated: ['event', 'userRoles'] })
}

/**
 * Retrieves all the entries an user contributed to
 * @param  {User} user
 * @return {array(Entry)|null}
 */
async function findUserEntries (user) {
  let entryCollection = await Entry.query((qb) => {
    qb.distinct()
      .innerJoin('user_role', 'entry.id', 'user_role.node_id')
      .where('user_role.user_id', user.get('id'))
  }).fetchAll({ withRelated: ['userRoles'] })
  return entryCollection.models
}

/**
 * Retrieves the entry a user submited to an event
 * @param  {User} user
 * @param  {string} eventId
 * @return {Entry|null}
 */
async function findUserEntryForEvent (user, eventId) {
  return Entry.query((query) => {
    query.innerJoin('user_role', 'entry.id', 'user_role.node_id')
      .where({
        'entry.event_id': eventId,
        'user_role.user_id': user.get('id')
      })
  }).fetch({ withRelated: ['userRoles'] })
}
