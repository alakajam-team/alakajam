'use strict'

/**
 * Service for interacting with events & entries.
 *
 * @module services/event-service
 */

const Event = require('../models/event-model')
const Entry = require('../models/entry-model')

module.exports = {
  findEventById,
  findAllEvents,
  findEventByStatus,

  createEntry,
  findEntryById,
  findUserEntryForEvent
}

/**
 * Fetches an Event by its ID, with all its Entries.
 * @param uuid {uuid} Event UUID
 * @returns {Event}
 */
async function findEventById (uuid) {
  return Event.where('uuid', uuid).fetch({ withRelated: 'entries' })
}

/**
 * Fetches all Events and their Entries.
 * @returns {Array(Event)}
 */
async function findAllEvents () {
  let eventModels = await new Event()
    .orderBy('title', 'DESC') // XXX Temporary prop
    .fetchAll({ withRelated: 'entries' })
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

async function createEntry (user, event) {
  // TODO Better use of Bookshelf API
  let entry = new Entry()
  await entry.save() // XXX generate UUID
  entry.set('event_uuid', event.get('uuid')) 
  entry.set('event_name', event.get('name')) // TODO Model listener
  let userRole = await entry.userRoles().create({
    user_uuid: user.get('uuid'),
    user_title: user.get('title'),
    role: 'owner'
  })
  await userRole.save()
  return entry
}

/**
 * Fetches an Entry by its ID.
 * @param uuid {uuid} Entry UUID
 * @returns {Entry}
 */
async function findEntryById (uuid) {
  return Entry.where('uuid', uuid).fetch({ withRelated: 'event' })
}

/**
 * Retrieves the entry a user submited to an event
 * @param  {User} user
 * @param  {string} eventUuid
 * @return {Entry|null}
 */
async function findUserEntryForEvent (user, eventUuid) {
  return Entry.query((query) => {
    query.innerJoin('user_role', 'uuid', 'user_role.node_uuid')
    query.where({
      'event_uuid': eventUuid,
      'user_role.user_uuid': user.get('uuid')
    })
  }).fetch()
}
