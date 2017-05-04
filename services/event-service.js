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
  findEntryById
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

/**
 * Fetches an Entry by its ID.
 * @param uuid {uuid} Entry UUID
 * @returns {Entry}
 */
async function findEntryById (uuid) {
  return Entry.where('uuid', uuid).fetch({ withRelated: 'event' })
}
