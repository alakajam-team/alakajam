/**
 * Store the number of ratings the entry received
 */
const config = require('../config')

const fileStorage = require('../core/file-storage')
const models = require('../core/models')

exports.up = async function (knex, Promise) {
  try {
    let entries = await models.Entry.fetchAll()
    console.log('Generate Thumbnails for ' + entries.length + ' entries.')
    let i = 0
    let u = 0
    entries.forEach(async entry => {
      i++
      if (entry.picturePreviews().length > 0) {
        u++
        await upgradePictures(entry, '.' + entry.picturePreviews()[0])
        await entry.save()
      }
      console.log(i + '/' + entries.length)
    })
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

/**
 * Upgrade the entry pictures and it's thumbnails associate
 * @param entry
 * @param file
 */
async function upgradePictures (entry, file) {
  let picturePath = '/entry/' + entry.get('id')
  let result = await fileStorage.savePictureUpload(file, picturePath, { maxWidth: 750, maxHeight: 500 })
  if (!result.error) {
    if (!entry.hasChanged('pictures')) {
      // Make sure to make pictures URLs change for caching purposes
      entry.set('updated_at', new Date())
    }
    // Thumbnails creation
    let resultThumbnail
    if (result && result.width >= result.height * 1.1) {
      resultThumbnail = await fileStorage.savePictureUpload(file, picturePath + config.THUMBNAIL_SUFFIX, { maxWidth: 350, fit: 'inside' })
    } else {
      resultThumbnail = await fileStorage.savePictureUpload(file, picturePath + config.THUMBNAIL_SUFFIX, { maxWidth: 350, maxHeight: 180, fit: 'contain' })
    }
    let resultThumbnail60x60 = await fileStorage.savePictureUpload(file, picturePath + config.THUMBNAIL_SUFFIX + '60x60', { maxWidth: 60, maxHeight: 60, fit: 'cover' })

    // delete previous picture (in case of a different extension)
    if (entry.picturePreviews().length > 0 && result.finalPath !== entry.picturePreviews()[0]) {
      await fileStorage.remove(entry.picturePreviews()[0])
    }
    if (entry.pictureThumbnail60x60() && resultThumbnail.finalPath !== entry.pictureThumbnail()) {
      await fileStorage.remove(entry.pictureThumbnail())
    }
    if (entry.pictureThumbnail60x60() && resultThumbnail60x60.finalPath !== entry.pictureThumbnail60x60()) {
      await fileStorage.remove(entry.pictureThumbnail60x60())
    }
    entry.set('pictures', { previews: [result.finalPath], thumbnail: resultThumbnail.finalPath, thumbnail60x60: resultThumbnail60x60.finalPath })
  }
  return result
}
