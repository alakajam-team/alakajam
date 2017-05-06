'use strict'

/**
 * User and authentication pages
 *
 * @module controllers/user-controller
 */

const userService = require('../services/user-service')
const sessionService = require('../services/session-service')

module.exports = {

  initRoutes: function (app) {
    app.get('/register', register)
    app.get('/login', loginForm)
    app.post('/login', doLogin)
    app.get('/logout', doLogout)

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
async function loginForm (req, res) {
  res.render('login')
}

async function doLogin (req, res) {
  let context = {}
  let [fields] = await req.parseForm()
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
async function doLogout (req, res) {
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
