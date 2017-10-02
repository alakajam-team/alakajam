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
const config = require('../config')
const constants = require('./constants')

let sharp = null
try {
  sharp = require('sharp')
} catch (e) {
  // Nothing
}

module.exports = {
  isValidPicture,

  savePictureUpload,

  exists,
  read,
  write,
  remove,
  createFolderIfMissing
}

const SOURCES_ROOT = path.join(__dirname, '..')

/**
 * @param {string} path
 * @returns {bool} whather the specified path is a vaild picture
 */
function isValidPicture (path) {
  let fileMimeType = mime.lookup(path)
  return constants.ALLOWED_PICTURE_MIMETYPES.indexOf(fileMimeType) !== -1
}

/**
 * Moves the file from a path to another. Typically used for saving temporary files.
 * @param {string} sourcePath The full path to the file to move
 * @param {string} targetPath The path to the destination, relative to the uploads folder.
 * @param {object} options (Optional) allowed: maxDiagonal
 *   If the file extension is omitted, it will be grabbed from the source path. If folders don't exist, they will be created.
 * @throws if the source path is not a valid picture
 * @returns {string} the URL to that path
 */
async function savePictureUpload (sourcePath, targetPath, options = {}) {
  if (!isValidPicture(sourcePath)) {
    throw new Error('Invalid picture mimetype (allowed: PNG GIF JPG)')
  }

  let actualTargetPath = targetPath.replace(/^[\\/]/, '') // remove leading slash
  if (actualTargetPath.indexOf(config.UPLOADS_PATH) === -1) {
    actualTargetPath = path.join(config.UPLOADS_PATH, actualTargetPath)
  }
  console.log(actualTargetPath)
  let sourcePathExtension = path.extname(sourcePath)
  if (!targetPath.endsWith(sourcePathExtension)) {
    // TODO replace extension rather than just append
    actualTargetPath += sourcePathExtension
  }

  let absoluteTargetPath = toAbsolutePath(actualTargetPath)
  await createFolderIfMissing(path.dirname(absoluteTargetPath))
  await resize(sourcePath, absoluteTargetPath, options.maxDiagonal || 2000)
  return url.resolve('/', path.relative(SOURCES_ROOT, absoluteTargetPath))
}

async function resize (sourcePath, targetPath, maxDiagonal) {
  // Sharp is an optional dependency
  if (sharp) {
    // Check whether image is too big
    let source = sharp(sourcePath)
    let meta = await source.metadata()
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

  // Don't modify the image if small enough (or sharp is missing)
  return fs.rename(sourcePath, targetPath)
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
 * Creates a folder. No op if the folder exists.
 * Does *not* make the folder relative to the file storage root.
 */
async function createFolderIfMissing (folderPath) {
  if (!await exists(folderPath)) {
    await mkdirp(folderPath)
  }
}
