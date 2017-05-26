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
  toUploadPath,
  move,
  exists,
  read,
  write,
  remove,
  createFolderIfMissing
}

const SOURCES_ROOT = path.join(__dirname, '..')
const STATIC_ROOT = path.join(SOURCES_ROOT, 'static')
const UPLOADS_URL = ('/' + config.UPLOADS_PATH + '/').replace(/\/\//g, '/')

/**
 * Prepends the specified path with the uploads static folder
 * @param  {string} anyPath 
 * @return {string}
 */
function toUploadPath (anyPath) {
  if (anyPath.indexOf(config.UPLOADS_PATH) === -1) {
    return path.join(config.UPLOADS_PATH, anyPath)
  } else {
    return anyPath
  }
}

/**
 * Moves the file from a path to another. Typically used for saving temporary files.
 * @param {string} sourcePath - The full path to the file to move
 * @param {string} targetPath - The path to the destination, relative to the uploads folder.
 *   If the file extension is omitted, it will be grabbed from the source path. If folders don't exist, they will be created.
 * If target path doesn't contain an extension
 * @returns the URL to that path if possible
 */
async function move (sourcePath, targetPath) {
  let trueTargetPath = targetPath.replace(/^[\\/]/, '') // remove leading slash
  let sourcePathExtension = path.extname(sourcePath)
  if (!targetPath.endsWith(sourcePathExtension)) {
    // TODO replace extension rather than just append
    trueTargetPath += sourcePathExtension
  }

  let absoluteTargetPath = toAbsolutePath(trueTargetPath)
  await createFolderIfMissing(path.dirname(absoluteTargetPath))
  await fs.rename(sourcePath, absoluteTargetPath)
  if (absoluteTargetPath.indexOf(STATIC_ROOT) !== -1) {
    log.info("!")
  log.info(url.resolve('/', path.relative(SOURCES_ROOT, absoluteTargetPath)))
  log.whereami()
    return url.resolve('/', path.relative(SOURCES_ROOT, absoluteTargetPath))
  } else {
    return null
  }
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
