'use strict'

/**
 * User and authentication pages
 *
 * @module controllers/user-controller
 */

const config = require('../config')
const constants = require('../core/constants')
const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
const cacheProvider = require('../core/cache')
const userService = require('../services/user-service')
const sessionService = require('../services/session-service')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')
const inviteService = require('../services/invite-service')
const securityService = require('../services/security-service')

module.exports = {
  dashboardMiddleware,

  viewUserProfile,

  dashboardFeed,
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
  if (!res.locals.user || res.locals.user === undefined) {
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
  let profileUser = await userService.findByName(req.params.name)
  if (profileUser) {
    let [entries, postsCollection] = await Promise.all([
      eventService.findUserEntries(profileUser),
      postService.findPosts({userId: profileUser.get('id')}),
      profileUser.load('details')
    ])

    res.render('user/profile', {
      profileUser,
      entries,
      posts: postsCollection.filter(function (post) {
        return post.get('special_post_type') !== constants.SPECIAL_POST_TYPE_ARTICLE
      })
    })
  } else {
    res.errorPage(400, 'No user exists with name ' + req.params.name)
  }
}

/**
 * View comment feed
 */
async function dashboardFeed (req, res) {
  let dashboardUser = res.locals.user

  // if an entry is not in the cache it will return undefined
  let byUserCollection = cacheProvider.cache.get(dashboardUser.get('name').toLowerCase() + '_byUserCollection')
  let toUserCollection = cacheProvider.cache.get(dashboardUser.get('name').toLowerCase() + '_toUserCollection')
  let latestEntries = cacheProvider.cache.get(dashboardUser.get('name').toLowerCase() + '_latestEntries')
  let latestPostsCollection = cacheProvider.cache.get(dashboardUser.get('name').toLowerCase() + '_latestPostsCollection')

  if (byUserCollection === undefined) {
    byUserCollection = await postService.findCommentsByUser(dashboardUser)
    cacheProvider.cache.set(dashboardUser.get('name').toLowerCase() + '_byUserCollection', byUserCollection, cacheProvider.ttlInMins * 60)
  }
  if (toUserCollection === undefined) {
    toUserCollection = await postService.findCommentsToUser(dashboardUser)
    cacheProvider.cache.set(dashboardUser.get('name').toLowerCase() + '_toUserCollection', toUserCollection, cacheProvider.ttlInMins * 60)
  }
  if (latestEntries === undefined) {
    latestEntries = await eventService.findUserEntries(dashboardUser)
    cacheProvider.cache.set(dashboardUser.get('name').toLowerCase() + '_latestEntries', latestEntries, cacheProvider.ttlInMins * 60)
  }
  if (latestPostsCollection === undefined) {
    latestPostsCollection = await postService.findPosts({
      userId: dashboardUser.id
    })
    cacheProvider.cache.set(dashboardUser.get('name').toLowerCase() + '_latestPostsCollection', latestPostsCollection, cacheProvider.ttlInMins * 60)
  }

  dashboardUser.set('notifications_last_read', new Date())
  await dashboardUser.save()

  cacheProvider.cache.del(dashboardUser.get('name').toLowerCase() + '_unreadNotifications')

  // TODO Limit at the SQL-level
  res.render('user/dashboard-feed', {
    byUser: byUserCollection.take(20),
    toUser: toUserCollection.take(20),
    latestEntry: latestEntries.length > 0 ? latestEntries[0] : null,
    latestPosts: latestPostsCollection.take(3)
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
    allowDrafts: true
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
 * Manage general user info
 */
async function dashboardSettings (req, res) {
  await res.locals.dashboardUser.load('details')

  let errorMessage = ''
  let infoMessage = ''

  if (req.method === 'POST') {
    let {fields, files} = await req.parseForm()
    if (!res.headersSent) { // FIXME Why?
      let dashboardUser = res.locals.dashboardUser

      if (!forms.isEmail(fields.email)) {
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
        if (fields['special-permissions']) {
          let isMod = fields['special-permissions'] === 'mod' || fields['special-permissions'] === 'admin'
          let isAdmin = fields['special-permissions'] === 'admin'
          dashboardUser.set({
            'is_mod': isMod ? 'true' : '',
            'is_admin': isAdmin ? 'true' : ''
          })
        }
        let dashboardUserDetails = dashboardUser.related('details')
        dashboardUserDetails.set('social_links', {
          website: fields.website,
          twitter: forms.sanitizeString(fields.twitter.replace('@', ''))
        })
        dashboardUserDetails.set('body', forms.sanitizeMarkdown(fields.body))
        await dashboardUserDetails.save()

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
  if (config.DEBUG_ENABLE_INVITE_SYSTEM && !await inviteService.validateKey(fields.invite)) {
    errorMessage = 'Invalid invite key'
  } else if (!(fields.name && fields.password && fields.email)) {
    errorMessage = 'A field is missing'
  } else if (!forms.isUsername(fields.name)) {
    errorMessage = 'Your usename is too weird (either too short, or has special chars other than "_" or "-", or starts with a number)'
  } else if (fields.password !== fields['password-bis']) {
    errorMessage = 'Passwords do not match'
  } else {
    let result = await userService.register(fields.email, fields.name, fields.password)
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
