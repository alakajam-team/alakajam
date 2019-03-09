'use strict'

/**
 * File & folder manipulation, mostly for picture storage.
 *
 * @module core/file-storage
 */

const promisify = require('promisify-node')
const fs = promisify('fs')
const mkdirp = promisify('mkdirp')
const path = require('path')
const url = require('url')
const mime = require('mime-types')
const log = require('./log')
const constants = require('./constants')
const config = require('../config')

let sharp = null
try {
  sharp = require('sharp')
} catch (e) {
  log.warn('Sharp dependency missing. Picture resizing disabled')
}

module.exports = {
  isValidPicture,

  savePictureToModel,
  savePictureUpload,

  exists,
  read,
  write,
  remove,
  createFolderIfMissing
}

const SOURCES_ROOT = path.join(__dirname, '..')

// Leading bytes for common image formats.
// See https://stackoverflow.com/a/8475542/1213677 and https://github.com/sindresorhus/file-type/blob/master/index.js
const IMAGE_HEADER_MAGIC_TO_TYPE = {
  'ffd8ff': 'jpg',
  '89504e470d0a1a0a': 'png',
  '474946': 'gif'
}

/**
 * Get the type of an image file.
 *
 * @param {string} filepath the absolute path to a file.
 * @returns {string} one of 'jpg', 'png' or 'gif' if valid; undefined if not.
 */
async function getImageType (filepath) {
  // Read the first four bytes of the file to ensure it's an image. See
  // IMAGE_HEADER_MAGIC_TO_TYPE and the stackoverflow link there.
  let fileHandle = await fs.open(filepath, 'r')
  let buf = Buffer.alloc(8)
  await fs.read(fileHandle, buf, 0, 8, 0)
  await fs.close(fileHandle)
  let leadingBytes = buf.toString('hex', 0, 8)

  for (let header in IMAGE_HEADER_MAGIC_TO_TYPE) {
    if (leadingBytes.indexOf(header) === 0) {
      return IMAGE_HEADER_MAGIC_TO_TYPE[header]
    }
  }
}

/**
 * @param {string} path
 * @returns {bool} whather the specified path is a valid picture
 */
async function isValidPicture (path) {
  if (await exists(path)) {
    return (await getImageType(path)) !== undefined
  } else {
    return false
  }
}

/**
 * Saves a file upload on a model. The picture will be resized (if needed) & moved, but model.save() won't be called.
 * The file extension will be grabbed from the source path. If folders don't exist, they will be created.
 * If there was a pre-exiting picture, it will be deleted.
 * @param {Model} model
 * @param {string} attribute
 * @param {object} fileUpload The form field to save
 * @param {string} deleteFile Whether to delete the picture
 * @param {string} targetPathWithoutExtension The path to the destination, **relative to the uploads folder**
 * @param {object} options (Optional) allowed: maxDiagonal
 * @returns {object} result, with either "error" or "finalPath" set, or nothing if the picture was deleted
 */
async function savePictureToModel (model, attribute, fileUpload, deleteFile, targetPathWithoutExtension, options = {}) {
  if (deleteFile) {
    // Delete picture
    if (model.get(attribute)) {
      await remove(model.get(attribute))
    }
    model.set(attribute, null)
    return {}
  } else if (fileUpload) {
    // Upload or replace picture
    let result = await savePictureUpload(fileUpload, targetPathWithoutExtension, options)
    if (!result.error) {
      let previousPath = model.get(attribute)
      if (previousPath && previousPath !== result.finalPath) {
        await remove(previousPath)
      }
      if (result.finalPath === previousPath) {
        // Make sure to change the last_updated date, because it is used
        // on picture URLs as a query string to clear the client cache
        model.set('updated_at', new Date())
      } else {
        model.set(attribute, result.finalPath)
      }
    }
    return result
  } else {
    return { error: 'Invalid upload' }
  }
}

/**
 * Saves an upload to the specified path, resizing it if needed in the process.
 * The file extension will be grabbed from the source path. If folders don't exist, they will be created.
 * @param {string} fileUploadOrPath The form field to save, or the file path if this is not a form upload
 * @param {object|string} targetPathWithoutExtension The path to the destination, **relative to the uploads folder**
 * @param {object} options (Optional) allowed: maxDiagonal / maxWidth / maxHeight / fit / suffix). See presets: constants.PICTURE_OPTIONS_*
 * @throws if the source path is not a valid picture
 * @returns {string} the URL to that path
 */
async function savePictureUpload (fileUploadOrPath, targetPathWithoutExtension, options = { maxDiagonal: 2000 }) {
  let filePath = (typeof fileUploadOrPath === 'string') ? fileUploadOrPath : fileUploadOrPath.path
  let mimetype = (typeof fileUploadOrPath === 'string') ? mime.lookup(fileUploadOrPath) : fileUploadOrPath.mimetype
  let fileExtension = mime.extension(mimetype)

  if (!(await isValidPicture(filePath))) {
    return { error: 'Invalid picture type (allowed: PNG GIF JPG)' }
  }
  let actualTargetPath = targetPathWithoutExtension.replace(/^[\\/]/, '') // remove leading slash
  if (actualTargetPath.indexOf(config.UPLOADS_PATH) === -1) {
    actualTargetPath = path.join(config.UPLOADS_PATH, actualTargetPath)
  }
  actualTargetPath += (options.suffix || '') + '.' + fileExtension
  let absoluteTargetPath = toAbsolutePath(actualTargetPath)

  await createFolderIfMissing(path.dirname(absoluteTargetPath))
  let res = await resize(filePath, absoluteTargetPath, options)
  return { ...res, finalPath: url.resolve('/', path.relative(SOURCES_ROOT, absoluteTargetPath)) }
}

async function resize (sourcePath, targetPath, options = {}) {
  let res
  // Sharp is an optional dependency
  if (sharp) {
    // Disable thumbnail resizing for gifs (unsupported by sharp for now)
    // https://github.com/lovell/sharp/issues/1372
    if ((await getImageType(sourcePath) === 'gif') && options.maxWidth >= constants.PICTURE_OPTIONS_THUMB.maxWidth) {
      delete options.maxWidth
      delete options.maxHeight
    }

    // Prevent file to stay opened after resize
    sharp.cache(false)

    // Check whether image is too big
    let source = sharp(sourcePath)
    let meta = await source.metadata()
    if (options.maxWidth || options.maxHeight) {
      if ((options.maxWidth && meta.width > options.maxWidth) || (options.maxHeight && meta.height > options.maxHeight)) {
        return source.resize(
          options.maxWidth, options.maxHeight, {
            fit: options.fit || 'inside',
            withoutEnlargement: false,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        ).toFile(targetPath)
      }
    } else {
      let maxDiagonal = options.maxDiagonal || 2000
      let diagonalSq = meta.width * meta.width + meta.height * meta.height
      if (diagonalSq > maxDiagonal * maxDiagonal) {
        // Resize to max size
        let diagonal = Math.max(Math.sqrt(diagonalSq))
        return source.resize(
          Math.ceil(meta.width * maxDiagonal / diagonal),
          Math.ceil(meta.height * maxDiagonal / diagonal))
          .toFile(targetPath)
      }
    }
    res = meta
  }

  // Copy the image if small enough (or sharp is missing)
  fs.copyFile(sourcePath, targetPath)
  return res
}

async function exists (documentPath) {
  let absolutePath = toAbsolutePath(documentPath)
  try {
    await fs.access(absolutePath, fs.constants.R_OK)
    return true
  } catch (e) {
    return false
  }
}

/**
 * [read description]
 * @param  {string}  documentPath
 * @return {string} the file contents as a string. Caller must parse JSON himself if needed.
 */
async function read (documentPath) {
  let absolutePath = toAbsolutePath(documentPath)
  let fileBuffer = await fs.readFile(absolutePath)
  return fileBuffer.toString()
}

/**
 * Writes data to a file
 * @param  {string} documentPath Destination file
 * @param  {string} data Contents to write. If a function, will be evaluated. If an object/array, will be stringified.
 */
async function write (documentPath, data) {
  if (typeof data === 'function') {
    data = data()
  }
  if (typeof data === 'object') {
    data = JSON.stringify(data)
  }

  let absolutePath = toAbsolutePath(documentPath)
  await createFolderIfMissing(path.dirname(documentPath))
  return fs.writeFile(absolutePath, data)
}

async function remove (documentPath) {
  let absolutePath = toAbsolutePath(documentPath)
  if (await exists(documentPath)) {
    await fs.unlink(absolutePath)
  }
}

function toAbsolutePath (anyPath) {
  if (anyPath.indexOf(SOURCES_ROOT) === -1) {
    return path.join(SOURCES_ROOT, anyPath)
  } else {
    return anyPath
  }
}

/**
 * Creates a folder. No-op if the folder exists.
 * Does *not* make the folder relative to the file storage root.
 */
async function createFolderIfMissing (folderPath) {
  if (!await exists(folderPath)) {
    await mkdirp(folderPath)
  }
}
