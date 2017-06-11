'use strict'

/**
 * User and authentication pages
 *
 * @module controllers/user-controller
 */

const config = require('../config')
const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')
const inviteService = require('../services/invite-service')
const securityService = require('../services/security-service')

module.exports = {
  dashboardMiddleware,

  viewUserProfile,

  dashboardPosts,
  dashboardInvite,
  dashboardSettings,
  dashboardPassword,

  registerForm,
  doRegister,
  loginForm,
  doLogin,
  doLogout
}

async function dashboardMiddleware (req, res, next) {
  if (!res.locals.user) {
    res.errorPage(403, 'You are not logged in.')
  } else {
    if (req.query.user && securityService.isAdmin(res.locals.user) &&
        req.query.user !== res.locals.user.get('name')) {
      res.locals.dashboardUser = await userService.findByName(forms.sanitizeString(req.query.user))
      res.locals.dashboardAdminMode = true
    } else {
      res.locals.dashboardUser = res.locals.user
    }
    next()
  }
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

/**
 * Manage general user info
 */
async function dashboardSettings (req, res) {
  let errorMessage = ''
  let infoMessage = ''

  if (req.method === 'POST') {
    let {fields, files} = await req.parseForm()
    if (!res.headersSent) { // FIXME Why?
      let dashboardUser = res.locals.dashboardUser

      if (fields.email && forms.isEmail(fields.email)) {
        errorMessage = 'Invalid email'
      } else if (fields['social_web'] && !forms.isURL(fields['social_web'])) {
        errorMessage = 'Invalid URL'
      } else if (!res.locals.dashboardAdminMode && fields['special-permissions']) {
        errorMessage = 'Not allowed to change special permissions on this user'
      }

      if (!errorMessage) {
        // General settings form
        dashboardUser.set('title', forms.sanitizeString(fields.title || dashboardUser.get('name')))
        dashboardUser.set('email', fields.email)
        dashboardUser.set('social_web', fields.website)
        dashboardUser.set('social_twitter', forms.sanitizeString(fields.twitter.replace('@', '')))
        dashboardUser.set('body', forms.sanitizeMarkdown(fields.body))
        if (fields['special-permissions']) {
          let isMod = fields['special-permissions'] === 'mod' || fields['special-permissions'] === 'admin'
          let isAdmin = fields['special-permissions'] === 'admin'
          dashboardUser.set({
            'is_mod': isMod ? 'true' : '',
            'is_admin': isAdmin ? 'true' : ''
          })
        }

        if (dashboardUser.hasChanged('title')) {
          await userService.refreshUserReferences(dashboardUser)
        }

        // TODO Formidable shouldn't create an empty file
        let newAvatar = files.avatar && files.avatar.size > 0
        if (dashboardUser.get('avatar') && (files['avatar-delete'] || newAvatar)) {
          await fileStorage.remove(dashboardUser.get('avatar'))
          dashboardUser.unset('avatar')
        }
        if (newAvatar) {
          let avatarPath = '/user/' + dashboardUser.get('id')
          let finalPath = await fileStorage.savePictureUpload(
            files.avatar.path, avatarPath, {maxDiagonal: 500})
          dashboardUser.set('avatar', finalPath)
        }
        await dashboardUser.save()
      }
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
    userId: res.locals.dashboardUser.get('id'),
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
 * Generate invite keys
 */
async function dashboardInvite (req, res) {
  res.render('user/dashboard-invite', {
    inviteKey: await inviteService.generateKey()
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
    let dashboardUser = res.locals.dashboardUser

    // Change password form
    if (!res.locals.dashboardAdminMode && !fields['password']) {
      errorMessage = 'You must enter your current password'
    } else if (!res.locals.dashboardAdminMode && !await userService.authenticate(dashboardUser.get('name'), fields['password'])) {
      errorMessage = 'Current password is incorrect'
    } else if (!fields['new-password']) {
      errorMessage = 'You must enter a new password'
    } else if (fields['new-password'] !== fields['new-password-bis']) {
      errorMessage = 'New passwords do not match'
    } else {
      let result = userService.setPassword(dashboardUser, fields['new-password'])
      if (result !== true) {
        errorMessage = result
      } else {
        await dashboardUser.save()
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
  if (!await inviteService.validateKey(fields.invite) && !config.DEBUG_ALLOW_INVALID_INVITE_KEYS) {
    errorMessage = 'Invalid invite key'
  } else if (!(fields.name && fields.password)) {
    errorMessage = 'Username or password missing'
  } else if (!forms.isUsername(fields.name)) {
    errorMessage = 'Your usename is too weird (either too short, or has special chars other than "_" or "-", or starts with a number)'
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
    fields.errorMessage = errorMessage
    res.render('register', fields)
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
