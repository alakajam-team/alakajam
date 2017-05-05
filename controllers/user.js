'use strict'

/**
 * Entry pages
 *
 * @module controllers/entry
 */

const userService = require('../services/user-service')

module.exports = {

  initRoutes: function (app) {
    app.use('/register', register)
    app.use('/login', login)
    app.use('/logout', logout)

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
  // TODO
  res.render('login')
}

/**
 * Login form
 */
async function logout (req, res) {
  // TODO
  res.render('login', {
    message: 'Logout successful.'
  })
}

/**
 * Displays a user profile
 */
async function viewUserProfile (req, res) {
  res.render('user/profile')
}