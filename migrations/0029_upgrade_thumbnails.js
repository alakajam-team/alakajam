const promisify = require('promisify-node')
const fs = promisify('fs')

const models = require('../core/models')
const eventService = require('../services/event-service')

exports.up = async function (knex, Promise) {
  try {
    let entries = await models.Entry.where({}).orderBy('id', 'ASC').fetchAll()
    console.log('Generate Thumbnails for ' + entries.length + ' entries.')
    let i = 0
    let u = 0
    for (const entry of entries.models) {
      try {
        i++
        if (entry.picturePreviews().length > 0) {
          u++
            let movedFile = '.' + entry.picturePreviews()[0].replace('.','-old.')
            await fs.rename('.' + entry.picturePreviews()[0], movedFile)
            await eventService.setEntryPicture(entry, movedFile)
            await entry.save()
            await fs.unlink(movedFile)
        }
        console.log(i + '/' + entries.length)
      } catch (e) {
        console.error('Failed to generate thumbnails for entry ' + entry.get('name') + ', picture: ' + entry.picturePreviews()[0], e)
      }
    }
    console.log('Generated Thumbnails: ' + u)

    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}

exports.down = async function (knex, Promise) {
  try {
    // Nothing to do
    Promise.resolve()
  } catch (e) {
    console.log(e.message)
    Promise.reject(e)
  }
}
