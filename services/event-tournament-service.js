'use strict'

/**
 * Service for managing tournaments.
 *
 * @module services/event-tournament-service
 */

const models = require('../core/models')

module.exports = {
  getTournamentEntries,
  addTournamentEntry,
  setTournamentEntryOrder,
  removeTournamentEntry
}

async function getTournamentEntries (event) {
  await event.load(['tournamentEntries.entry.userRoles'])
  return event.related('tournamentEntries').orderBy('order')
}

async function addTournamentEntry (event, entry) {
  let tEntry = await _getTournamentEntry(event, entry)
  if (!tEntry) {
    tEntry = new models.TournamentEntry({
      event_id: event.get('id'),
      entry_id: entry.get('id')
    })
    await tEntry.save()
  }
  return tEntry
}

async function setTournamentEntryOrder (event, entry, order) {
  let tEntry = await _getTournamentEntry(event, entry)
  tEntry.set('order', order)
  return tEntry.save()
}

async function removeTournamentEntry (event, entry) {
  let tEntry = await _getTournamentEntry(event, entry)
  if (tEntry) {
    await tEntry.destroy()
  }
}

async function _getTournamentEntry (event, entry) {
  return models.TournamentEntry.where({
    event_id: event.get('id'),
    entry_id: entry.get('id')
  })
    .fetch()
}
