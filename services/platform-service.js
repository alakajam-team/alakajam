'use strict'

/**
 * Service for manipulating game platforms
 *
 * @module services/platform-service
 */

const constants = require('../core/constants')
const models = require('../core/models')
const db = require('../core/db')
const cache = require('../core/cache')
const log = require('../core/log')

module.exports = {
  searchPlatforms,
  fetchById,
  fetchAllNames,
  fetchAll,
  fetchMultipleNamed,
  countEntriesByPlatform,

  createPlatform,
  setEntryPlatforms
}

/**
 * Search for a platform by name.
 *
 * @param {string} nameFragment a fragment of the name.
 * @returns {Bookshelf.Collection} platforms matching the search.
 */
function searchPlatforms (nameFragment) {
  return models.Platform.where('name', constants.DB_ILIKE, `%${nameFragment}%`)
}

/**
 * Fetch platform by ID
 *
 * @param {number} id
 */
async function fetchById (id) {
  return models.Platform.where({ id }).fetch()
}

/**
 * Fetch platforms by name (case-insensitive except in SQLite).
 *
 * @param {string[]} names the platform names to fetch by.
 */
function fetchMultipleNamed (names) {
  return models.Platform.query(qb => qb.whereIn('name', names)).fetchAll()
}

/**
 * Load all platform names.
 *
 * @returns {Promise<string[]>} a promise which resolves with the names.
 */
async function fetchAllNames () {
  let names = (await db.knex('platform').select('name')).map(({name}) => name)
  names.sort()
  return names
}

/** Fetch all platform instances. */
async function fetchAll () {
  if (!cache.general.get('platforms')) {
    cache.general.set('platforms',
      await models.Platform.forge()
        .orderBy('name')
        .fetchAll())
  }
  return cache.general.get('platforms')
}

/**
 * Counts the number of entries using a given platform
 *
 * @param  {Platform} platform
 * @return {number}
 */
async function countEntriesByPlatform (platform) {
  let count = await models.EntryPlatform
    .where('platform_id', platform.get('id'))
    .count()
  return parseInt(count)
}

/**
 * Creates a platform
 * @param  {string} name
 * @return {Platform}
 */
function createPlatform (name) {
  return new models.Platform({ name })
}

/**
 * Set the platforms of an entry.
 * The data is duplicated on `entry.platforms` (for quick access) and the `entry_platform` table (for search queries).
 *
 * @param {models.Entry} entry the entry instance.
 * @param {models.Platform[]} platforms the platforms to set.
 * @returns {Promise} a promise which resolves when complete.
 */
async function setEntryPlatforms (entry, platforms) {
  const entryId = entry.get('id')
  const platformNames = platforms.map(p => p.get('name'))
  const platformIds = platforms.map(p => p.id)

  try {
    await db.knex.transaction(async function (transaction) {
      const existingIds = (
        await transaction('entry_platform')
          .select('platform_id')
          .where('entry_id', entryId)
      ).map(({platform_id}) => platform_id) // eslint-disable-line camelcase
      const toRemoveIds = existingIds.filter(id => !platformIds.includes(id))
      const toAdd = platforms
        .filter(p => !existingIds.includes(p.id))
        .map(p => ({
          entry_id: entryId,
          platform_id: p.id,
          platform_name: p.get('name')
        }))

      const promises = []
      promises.push(entry.save('platforms', platformNames, {transacting: transaction}))

      if (toAdd.length > 0) { // Insert new entry_platform records.
        promises.push(transaction('entry_platform').insert(toAdd))
      }
      if (toRemoveIds.length > 0) { // Remove old entry_platform records.
        promises.push(
          transaction('entry_platform')
            .whereIn('platform_id', toRemoveIds)
            .andWhere('entry_id', '=', entryId)
            .del()
        )
      }
      await Promise.all(promises)
    })
  } catch (e) {
    log.error('Failed to update entry platforms')
    log.error(e)
  }
}
