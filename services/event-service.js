'use strict'

/**
 * Service for interacting with events & entries.
 * 
 * @module services/event
 */

const Event = require('../models/event-model')
const Entry = require('../models/entry-model')

module.exports = {
  findEventById,
  findAllEvents,
  findLiveEvent,
  findEntryById
}

/**
 * Fetches an Event by its ID, with all its Entries.
 * @param uuid {uuid} Event UUID
 * @returns {Event}
 */
async function findEventById (uuid) {
  return await Event.where('id', uuid).fetch({ withRelated: 'entries' })
}

/**
 * Fetches all Events and their Entries.
 * @returns {Array(Event)}
 */
async function findAllEvents () {
  let eventModels = await new Event()
    .orderBy('title', 'DESC') // XXX Temporary
    .fetchAll({ withRelated: 'entries' })
  return eventModels.models
}

/**
 * Fetches the currently live Event.
 * @returns {Event}
 */
async function findLiveEvent () {
  return await new Event({ status_global: 'open' }).fetch()
}

/**
 * Fetches an Entry by its ID.
 * @param uuid {uuid} Entry UUID
 * @returns {Entry}
 */
async function findEntryById (uuid) {
  return await new Entry({id: uuid}).fetch({ withRelated: 'event' })
}
