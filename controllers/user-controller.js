'use strict'

/**
 * User and authentication pages
 *
 * @module controllers/user-controller
 */

const fileStorage = require('../core/file-storage')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')

module.exports = {
  viewUserProfile,

  dashboardMiddleware,
  dashboardPosts,
  dashboardSettings,
  dashboardPassword,

  registerForm,
  doRegister,
  loginForm,
  doLogin,
  doLogout
}

/**
 * Display a user profile
 */
async function viewUserProfile (req, res) {
  let user = await userService.findByName(req.params.name)
  if (user) {
    res.render('user/profile', {
      profileUser: user,
      entries: await eventService.findUserEntries(user),
      posts: await postService.findPosts({ userId: user.get('id') })
    })
  } else {
    res.errorPage(400, 'No user exists with name ' + req.params.name)
  }
}

async function dashboardMiddleware (req, res, next) {
  if (!res.locals.user) {
    res.errorPage(403, 'You are not logged in.')
  } else {
    next()
  }
}

/**
 * Manage general user info
 */
async function dashboardSettings (req, res) {
  let errorMessage = ''
  let infoMessage = ''

  if (req.method === 'POST') {
    let {fields, files} = await req.parseForm()
    if (!res.headersSent) { // FIXME Why?
      let user = res.locals.user

      // General settings form
      user.set('title', fields.title || user.get('name'))
      user.set('email', fields.email)
      user.set('social_web', fields.website)
      user.set('social_twitter', fields.twitter.replace('@', ''))
      user.set('body', fields.body)

      if (user.hasChanged('title')) {
        await userService.refreshUserReferences(user)
      }

      // TODO Formidable shouldn't create an empty file
      let newAvatar = files.avatar && files.avatar.size > 0
      if (user.get('avatar') && (files['avatar-delete'] || newAvatar)) {
        await fileStorage.remove(user.get('avatar'))
        user.unset('avatar')
      }
      if (newAvatar) {
        let avatarPath = '/user/' + user.get('id')
        let finalPath = await fileStorage.savePictureUpload(
          files.avatar.path, avatarPath, {maxDiagonal: 500})
        user.set('avatar', finalPath)
      }
      await user.save()
    }
  }

  res.render('user/dashboard-settings', {
    errorMessage,
    infoMessage
  })
}

/**
 * Manage user posts
 */
async function dashboardPosts (req, res) {
  let newPostEvent = await eventService.findEventByStatus('open')
  if (!newPostEvent) {
    newPostEvent = await eventService.findEventByStatus('pending')
  }
  let allPostsCollection = await postService.findPosts({
    userId: res.locals.user.get('id'),
    withDrafts: true
  })
  let draftPosts = allPostsCollection.where({'published_at': null})

  res.render('user/dashboard-posts', {
    publishedPosts: allPostsCollection.difference(draftPosts),
    draftPosts,
    newPostEvent
  })
}

/**
 * Manage user profile contents
 */
async function dashboardPassword (req, res) {
  let errorMessage = ''
  let infoMessage = ''

  if (req.method === 'POST') {
    let {fields} = await req.parseForm()
    let user = res.locals.user

    // Change password form
    if (!fields['password']) {
      errorMessage = 'You must enter your current password'
    } else if (!await userService.authenticate(user.get('name'), fields['password'])) {
      errorMessage = 'Current password is incorrect'
    } else if (!fields['new-password']) {
      errorMessage = 'You must enter a new password'
    } else if (fields['new-password'] !== fields['new-password-bis']) {
      errorMessage = 'New passwords do not match'
    } else {
      let result = userService.setPassword(user, fields['new-password'])
      if (result !== true) {
        errorMessage = result
      } else {
        await user.save()
        infoMessage = 'Password change successful'
      }
    }
  }

  res.render('user/dashboard-password', {
    errorMessage,
    infoMessage
  })
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
    let result = await userService.register(fields.name, fields.password)
    if (result === true) {
      doLogin(req, res)
    } else {
      errorMessage = result
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
