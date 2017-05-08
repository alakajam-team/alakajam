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
const config = require('../config')

module.exports = {
  move,
  exists,
  read,
  write,
  remove,
  createFolderIfMissing
}

const SOURCES_ROOT = path.join(__dirname, '..')

/**
  Moves the file from a path to another. Typically used for saving temporary files.
  @param {string} sourcePath - The full path to the file to move
  @param {string} targetPath - The path to the destination, relative to the uploads folder.
    If the file extension is omitted, it will be grabbed from the source path. If folders don't exist, they will be created.
  If target path doesn't contain an extension
  @returns the final target path
*/
async function move (sourcePath, targetPath, isUpload = true) {
  let truePath = targetPath.replace(/^[\\/]/, '')
  let sourcePathExtension = path.extname(sourcePath)
  if (!targetPath.endsWith(sourcePathExtension)) {
    // TODO replace extension rather than just append
    truePath += sourcePathExtension
  }

  let absolutePath = toAbsolutePath(truePath, isUpload)
  await createFolderIfMissing(path.dirname(absolutePath))
  await fs.rename(sourcePath, absolutePath)

  return url.resolve(config.UPLOADS_PATH, truePath)
}

async function exists (documentPath, isUpload = true) {
  let absolutePath = toAbsolutePath(documentPath, isUpload)
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
 * @param  {Boolean} isUpload
 * @return {string} the file contents as a string. Caller must parse JSON himself if needed.
 */
async function read (documentPath, isUpload = true) {
  let absolutePath = toAbsolutePath(documentPath, isUpload)
  let fileBuffer = await fs.readFile(absolutePath)
  return fileBuffer.toString()
}

/**
 * Writes data to a file
 * @param  {string} documentPath Destination file
 * @param  {string} data Contents to write. If a function, will be evaluated. If an object/array, will be stringified.
 * @return {bool} isUpload (Optional) Whether to consider paths relative to the uploads folder (default) or the sources root.
 */
async function write (documentPath, data, isUpload = true) {
  if (typeof data === 'function') {
    data = data()
  }
  if (typeof data === 'object') {
    data = JSON.stringify(data)
  }

  let absolutePath = toAbsolutePath(documentPath, isUpload)
  await createFolderIfMissing(path.dirname(documentPath))
  return fs.writeFile(absolutePath, data)
}

async function remove (documentPath, isUpload = true) {
  let absolutePath = toAbsolutePath(documentPath, isUpload)
  if (await exists(documentPath, false)) {
    await fs.unlink(absolutePath)
  }
}

function toAbsolutePath (anyPath, isUpload) {
  let prefix = ''
  if (anyPath.indexOf(SOURCES_ROOT) === -1) {
    prefix = SOURCES_ROOT
  }
  if (isUpload) {
    prefix = path.join(prefix, SOURCES_ROOT)
  }
  return path.join(prefix, anyPath)
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
