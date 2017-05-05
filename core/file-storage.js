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

module.exports = {
  move,
  exists,
  read,
  write,
  remove,
  createFolderIfMissing
}

const UPLOADS_PATH = '/static/uploads/'
const UPLOADS_ROOT = path.join(__dirname, '..', UPLOADS_PATH)

/**
  Moves the file from a path to another. Typically used for saving temporary files.
  @param {string} sourcePath - The full path to the file to move
  @param {string} targetPath - The path to the destination, relative to the uploads folder.
    If the file extension is omitted, it will be grabbed from the source path. If folders don't exist, they will be created.
  If target path doesn't contain an extension
  @returns the final target path
*/
async function move (sourcePath, targetPath) {
  let truePath = targetPath.replace(/^[\\\/]/, '')
  let sourcePathExtension = path.extname(sourcePath)
  if (!targetPath.endsWith(sourcePathExtension)) {
    // TODO replace extension rather than just append
    truePath += sourcePathExtension
  }

  let absolutePath = path.join(UPLOADS_ROOT, truePath)
  await createFolderIfMissing(path.dirname(absolutePath))
  await fs.rename(sourcePath, absolutePath)
  
  return url.resolve(UPLOADS_PATH, truePath)
}

async function exists (documentPath) {
  let absolutePath = path.join(UPLOADS_ROOT, documentPath)
  try {
    await fs.access(absolutePath, fs.constants.R_OK)
    return true
  } catch (e) {
    return false
  }
}

async function read (documentPath) {
  let absolutePath = path.join(UPLOADS_ROOT, documentPath)
  return await fs.readFile(absolutePath)
}

async function write (documentPath, data) {
  let absolutePath = path.join(UPLOADS_ROOT, documentPath)
  await createFolderIfMissing(path.dirname(documentPath))
  return await fs.writeFile(absolutePath, data)
}

async function remove (documentPath) {
  let absolutePath = path.join(UPLOADS_ROOT, documentPath)
  await fs.unlink(absolutePath)
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
