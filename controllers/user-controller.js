'use strict'

/**
 * User and authentication pages
 *
 * @module controllers/user-controller
 */

const fileStorage = require('../core/file-storage')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const randomKey = require('random-key')

module.exports = {

  initRoutes: function (app) {
    app.get('/register', register)
    app.get('/login', login)
    app.post('/login', authenticate)
    app.get('/logout', logout)

    app.get('/user/:uuid', viewUserProfile)
  }

}

/**
 * Login form
 */
async function register (req, res) {
  // TODO
  res.render('register')
}

/**
 * Login form
 */
async function login (req, res) {
  res.render('login')
}

async function authenticate (req, res) {
  let context = {}
  let [fields, files] = await req.parseForm()
  if (fields.name && fields.password) {
    let user = await userService.authenticate(fields.name, fields.password)
    if (user) {
      context.user = user
      context.infoMessage = 'Authentication successful'
      sessionService.openSession(req, res, user, !!fields['remember-me'])
    } else {
      context.errorMessage = 'Authentication failed'
    }
  } else {
      context.errorMessage = 'Username or password missing'
  }

  res.render('login', context)
}

/**
 * Login form
 */
async function logout (req, res) {
  sessionService.invalidateSession(req, res)
  res.render('login', {
    infoMessage: 'Logout successful.'
  })
}

/**
 * Displays a user profile
 */
async function viewUserProfile (req, res) {
  res.render('user/profile')
}
