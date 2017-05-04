'use strict'

/**
 * File & folder manipulation, mostly for picture storage.
 *
 * @module core/file-storage
 */

const promisify = require('promisify-node')
const fs = promisify('fs')
// const path = require('path')

module.exports = {
  move,
  readDocument,
  saveDocument,
  createFolderIfMissing
}

// const UPLOADS_ROOT = path.join(__dirname, '../static/uploads')

/**
  Moves the file from a path to another. Typically used for saving temporary files.
  @param {string} sourcePath - The full path to the file to move
  @param {string} targetPath - The path to the destination.
    If the file extension is omitted, it will be grabbed from the source path. If folders don't exist, they will be created.
  If target path doesn't contain an extension
*/
async function move (sourcePath, targetPath) {
  // TODO
}

async function readDocument (documentPath) {
  // TODO
}

async function saveDocument (documentPath, data) {
  // TODO
}

/**
 * Creates a folder. No op if the folder exists.
 * XXX Does *not* support recursive creation
 */
async function createFolderIfMissing (folderPath) {
  try {
    await fs.access(folderPath, fs.constants.R_OK)
  } catch (e) {
    await fs.mkdir(folderPath)
  }
}
