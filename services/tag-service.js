const models = require('../core/models')
const config = require('../config')
const db = require('../core/db')

module.exports = {
  searchTags,
  fetchById,
  fetchByIds,

  createTag,
  updateEntryTags,

  fetchTagStats
}

/**
 * Search for a tag by name.
 *
 * @param {string} nameFragment a fragment of the name.
 * @returns {Bookshelf.Collection} tags matching the search.
 */
async function searchTags (nameFragment) {
  let results = await db.knex('tag')
    .where('value', (config.DB_TYPE === 'postgresql') ? 'ILIKE' : 'LIKE', `${nameFragment}%`)

  let formattedResults = []
  for (let result of results) {
    formattedResults.push(result.value)
  }
  formattedResults.sort(function (a, b) {
    return a.localeCompare(b)
  })
  return results
}

/**
 * Fetch tag by ID
 *
 * @param {number} id
 */
async function fetchById (id, options = {}) {
  return models.Tag.where({ id }).fetch(options)
}

/**
 * Fetch tag by ID
 *
 * @param {number} id
 */
async function fetchByIds (ids) {
  return models.Tag.where('id', 'in', ids).fetchAll()
}

/**
 * Creates a tag
 * @param  {string} value
 * @return {Tag}
 */
async function createTag (value) {
  let tag = new models.Tag({ value })
  return tag.save()
}

/**
 * Updates entry/tag associations, creating any missing tags in the process.
 *
 */
async function updateEntryTags (entry, tagInfo) {
  const entryId = entry.get('id')
  return db.knex.transaction(async function (transaction) {
    // Create missing tags
    let tagIds = tagInfo.map(strId => parseInt(strId))
      .filter(intId => !isNaN(intId) && intId > 0)
    let tagLabels = tagInfo.filter(label => isNaN(parseInt(label)) && label.trim())
    for (let tagLabel of tagLabels) {
      let createdTag = await createTag(tagLabel)
      tagIds.push(createdTag.get('id'))
    }

    // Find existing relations
    const existingIds = (
      await transaction('entry_tag')
        .select('tag_id')
        .where('entry_id', entryId)
    ).map(function (row) {
      return row.tag_id
    }) // eslint-disable-line camelcase

    // Create/delete relations
    const toRemoveIds = existingIds.filter(id => !tagIds.includes(id))
    const toAdd = tagIds.filter(id => !existingIds.includes(id))
      .map(id => ({
        entry_id: entryId,
        tag_id: id
      }))
    const promises = []
    if (toAdd.length > 0) { // Insert new entry_tag records.
      promises.push(transaction('entry_tag').insert(toAdd))
    }
    if (toRemoveIds.length > 0) { // Remove old entry_tag records.
      promises.push(
        transaction('entry_tag')
          .whereIn('tag_id', toRemoveIds)
          .andWhere('entry_id', '=', entryId)
          .del()
      )
    }
    await Promise.all(promises)

    // Clear empty tags
    if (toRemoveIds.length > 0) {
      await transaction('tag')
        .whereNotIn('id', function () {
          return this.from('entry_tag').distinct('tag_id')
        })
        .del()
    }
  })
}

async function fetchTagStats (options = {}) {
  return db.knex('entry_tag')
    .select('tag.id', 'tag.value', 'tag.created_at', db.knex.raw('count(*) as count'))
    .leftJoin('tag', 'entry_tag.tag_id', 'tag.id')
    .groupBy('tag.id', 'tag.value')
    .orderBy(options.orderByDate ? 'created_at' : 'count', 'DESC')
}
