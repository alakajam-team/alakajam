'use strict'

/**
 * Invite service. Lets users generate and share registration keys.
 *
 * @module services/invite-service
 */

const crypto = require('crypto')
const randomKey = require('random-key')
const constants = require('../core/constants')
const settingService = require('../services/setting-service')

const CIPHER_ALGO = 'aes-256-ctr'

module.exports = {
  generateKey,
  verifyKey
}

/**
 * Generates an invite key
 * @return {string}
 */
async function generateKey () {
  let invitePassword = await findOrCreateSetting(constants.SETTING_INVITE_PASSWORD)
  let invitePepper = await findOrCreateSetting(constants.SETTING_INVITE_PEPPER)
  let randomString = randomKey.generate(4)
  let encrypted = encrypt(randomString + invitePepper, invitePassword)
  return prettifyKey(encrypted)
}

/**
 * Verifies an invite key
 * @return {bool}
 */
async function verifyKey (text) {
  let invitePassword = await findOrCreateSetting(constants.SETTING_INVITE_PASSWORD)
  let invitePepper = await findOrCreateSetting(constants.SETTING_INVITE_PEPPER)
  let decrypted = decrypt(text.replace(/-/g, ''), invitePassword)
  return decrypted.indexOf(invitePepper) !== -1
}

async function findOrCreateSetting (setting) {
  let sessionKey = await settingService.find(setting)
  if (!sessionKey) {
    sessionKey = randomKey.generate(4)
    await settingService.save(setting, sessionKey)
  }
  return sessionKey
}

function encrypt (text, password) {
  let cipher = crypto.createCipher(CIPHER_ALGO, password)
  let crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex')
  return crypted
}

function decrypt (text, password) {
  let decipher = crypto.createDecipher(CIPHER_ALGO, password)
  let decrypted = decipher.update(text, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function prettifyKey (text) {
  let newText = ''
  for (let i = 0; i < text.length; i++) {
    if (i % 4 === 0 && newText !== '') {
      newText += '-'
    }
    newText += text[i]
  }
  return newText.toUpperCase()
}
