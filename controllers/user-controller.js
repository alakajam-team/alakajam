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
    app.get('/register', registerForm)
    app.post('/register', doRegister)
    app.get('/login', loginForm)
    app.post('/login', doLogin)
    app.get('/logout', doLogout)

    app.get('/user/:uuid', viewUserProfile)
  }

}

/**
 * Register form
 */
async function registerForm (req, res) {
  res.render('register')
}

/**
 * Register
 */
async function doRegister (req, res) {
  let {fields} = await req.parseForm()
  let errorMessage = null
  if (!(fields.name && fields.password)) {
    errorMessage = 'Username or password missing'
  } else if (fields.password !== fields['password-bis']) {
    errorMessage = 'Passwords do not match'
  } else {
    let user = await userService.register(fields.name, fields.password)
    if (user) {
      doLogin(req, res)
    } else {
      errorMessage = 'Username is taken'
    }
  }

  if (errorMessage) {
    res.render('register', { errorMessage })
  }
}

/**
 * Login form
 */
async function loginForm (req, res) {
  res.render('login')
}

/**
 * Login
 */
async function doLogin (req, res) {
  let context = {}
  let {fields} = await req.parseForm()
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
 * Logout
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
