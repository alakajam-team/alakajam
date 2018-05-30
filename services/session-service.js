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
const userService = require('./user-service')

module.exports = {
  loadSessionCache,
  openSession,
  invalidateSession,
  restoreSessionIfNeeded
}

const SESSIONS_FILE = path.join(config.DATA_PATH, 'sessions.json')
const REMEMBER_ME_MAX_AGE = 30 * 24 * 3600000 /* 30 days */
const COOKIE_DEFAULT_OPTIONS = { signed: true }

/**
 * (Sync) Checks whether a user session is valid
 * @returns {boolean} true if valid, false if invalid (usually because expired)
 */
async function restoreSessionIfNeeded (req, res) {
  req.userSession = {}

  // Look for active session
  let sessionCookie = req.cookies.get('session', COOKIE_DEFAULT_OPTIONS)
  if (sessionCookie) {
    try {
      req.userSession = JSON.parse(sessionCookie)
    } catch (e) {
      req.cookies.set('session', '', COOKIE_DEFAULT_OPTIONS) // clear session cookie
      sessionCookie = null
    }
  }

  // If no session, look for remember me cookie
  if (!sessionCookie) {
    let rememberMeCookie = req.cookies.get('rememberMe', COOKIE_DEFAULT_OPTIONS)
    if (rememberMeCookie) {
      let now = Date.now()
      let sessionCache = res.app.locals.sessionCache
      let sessionInfo = sessionCache[hash(rememberMeCookie)]

      if (sessionInfo && sessionInfo.expires > now) {
        // Recreate session cookie
        await _writeSessionCookie(req, res, sessionInfo.userId)

        // Renew cookie if we're halfway through expiry
        if (sessionInfo.expires - now < REMEMBER_ME_MAX_AGE / 2) {
          _writeRememberMeCookie(req, sessionCache, sessionInfo.userId)
        }
      } else {
        req.cookies.set('rememberMe', '', COOKIE_DEFAULT_OPTIONS) // clear remember me cookie
      }
    }
  }
}

/**
 * Loads the session cache from the persisted sessions file.
 * @return {Object} Session cache object
 */
async function loadSessionCache (app) {
  if (await fileStorage.exists(SESSIONS_FILE)) {
    let rawFile = await fileStorage.read(SESSIONS_FILE)
    app.locals.sessionCache = JSON.parse(rawFile)
  } else {
    app.locals.sessionCache = {}
  }
}

function invalidateSession (req, res) {
  let rememberMeCookie = req.cookies.get('rememberMe', COOKIE_DEFAULT_OPTIONS)
  if (rememberMeCookie) {
    let sessionCache = res.app.locals.sessionCache
    delete sessionCache[hash(rememberMeCookie)]
  }

  req.cookies.set('rememberMe', '', COOKIE_DEFAULT_OPTIONS)
  req.cookies.set('session', '', COOKIE_DEFAULT_OPTIONS)
  req.userSession = null
  res.locals.user = null
}

/**
 * Opens or refreshes a user session
 */
async function openSession (req, res, userId, rememberMe) {
  invalidateSession(req, res)

  // Clean expired sessions
  let sessionCache = res.app.locals.sessionCache
  let now = Date.now()
  for (let existingToken in sessionCache) {
    if (sessionCache[existingToken].expires < now) {
      delete sessionCache[existingToken]
    }
  }

  // Write cookie(s)
  await _writeSessionCookie(req, res, userId)
  if (rememberMe) {
    _writeRememberMeCookie(req, sessionCache, userId)
  }

  // Persist cache (no need to await)
  fileStorage.write(SESSIONS_FILE, sessionCache, false)
    .catch((e) => log.error(e.message))
}

function hash (token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Write session cookie
 */
async function _writeSessionCookie (req, res, userId) {
  req.userSession = { userId }
  req.cookies.set('session', JSON.stringify(req.userSession), {
    httpOnly: true,
    signed: true
  })
  res.locals.user = await userService.findById(userId)
}

/**
 * Write remember me cookie & store token hash
 */
function _writeRememberMeCookie (req, sessionCache, userId) {
  let now = Date.now()
  let token = randomKey.generate()
  let tokenExpires = now + REMEMBER_ME_MAX_AGE
  sessionCache[hash(token)] = {
    userId,
    expires: tokenExpires
  }
  req.cookies.set('rememberMe', token, {
    maxAge: REMEMBER_ME_MAX_AGE,
    expires: new Date(tokenExpires),
    httpOnly: true,
    signed: true
  })
}
