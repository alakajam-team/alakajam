  'use strict'

/**
 * Session service. Manipulates cookies, and controls a session cache
 * matching hashes of session tokens with user IDs (to support "remember me" stuff).
 *
 * @module services/session-service
 */

const path = require('path')
const crypto = require('crypto')
const randomKey = require('random-key')
const config = require('../config')
const log = require('../core/log')
const fileStorage = require('../core/file-storage')

module.exports = {
  loadSessionCache,
  openSession,
  invalidateSession,
  restoreSessionifNeeded
}

const SESSIONS_FILE = path.join(config.DATA_PATH, 'sessions.json')

/**
 * (Sync) Checks whether a user session is valid
 * @returns {boolean} true if valid, false if invalid (usually because expired)
 */
  function restoreSessionifNeeded (req, res) {
    req.session = {}

  // TODO refresh cookies if they're getting close to expiry
    let sessionCookie = req.cookies.get('session')
    if (sessionCookie) {
      try {
        req.session = JSON.parse(sessionCookie)
      } catch (e) {
        req.cookies.set('session')
        sessionCookie = null
      }
    }

    if (!sessionCookie) {
      let rememberMeCookie = req.cookies.get('rememberMe')
      if (rememberMeCookie) {
        let sessionCache = res.app.locals.sessionCache
        let sessionInfo = sessionCache[hash(rememberMeCookie)]
        if (sessionInfo) {
          req.session = {userId: sessionInfo.userId}
        } else {
          req.cookies.set('rememberMe')
        }
      }
    }
  }

/**
 * Loads the session cache from the persisted sessions file.
 * @return {Object} Session cache object
 */
  async function loadSessionCache () {
    if (await fileStorage.exists(SESSIONS_FILE, false)) {
      let rawFile = await fileStorage.read(SESSIONS_FILE, false)
      return JSON.parse(rawFile)
    } else {
      return {}
    }
  }

  function invalidateSession (req, res) {
    let rememberMeCookie = req.cookies.get('rememberMe')
    if (rememberMeCookie) {
      let sessionCache = res.app.locals.sessionCache
      delete sessionCache[hash(rememberMeCookie)]
    }

    req.cookies.set('rememberMe')
    req.cookies.set('session')
    req.session = null
    res.locals.user = null
  }

/**
 * Opens or refreshes a user session
 */
  function openSession (req, res, user, rememberMe) {
    invalidateSession(req, res)

  // Clean expired sessions
    let sessionCache = res.app.locals.sessionCache
    let now = Date.now()
    for (let existingToken in sessionCache) {
      if (sessionCache[existingToken].expires < now) {
        delete sessionCache[existingToken]
      }
    }

  // Write session cookie
    req.session = {userId: user.get('uuid')}
    req.cookies.set('session', JSON.stringify(req.session), {
      httpOnly: true,
      signed: true
    })
    res.locals.user = user

  // Write remember me cookie & store token hash
  // TODO Use better hashing than MD5
    if (rememberMe) {
      let token = randomKey.generate()
      let maxAge = 30 * 24 * 3600000
      let tokenExpires = now + maxAge
      sessionCache[hash(token)] = {
        userId: user.get('uuid'),
        expires: tokenExpires
      }
      req.cookies.set('rememberMe', token, {
        maxAge: maxAge,
        expires: new Date(tokenExpires),
        httpOnly: true,
        signed: true
      })
    }

  // Persist cache (no need to await)
    fileStorage.write(SESSIONS_FILE, sessionCache, false)
    .catch((e) => log.error(e.message))
  }

function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}