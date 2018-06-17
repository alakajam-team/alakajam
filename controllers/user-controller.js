'use strict'

/**
 * User and authentication pages
 *
 * @module controllers/user-controller
 */

const constants = require('../core/constants')
const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
const cache = require('../core/cache')
const userService = require('../services/user-service')
const eventService = require('../services/event-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const entryImportService = require('../services/entry-import-service')

module.exports = {
  dashboardMiddleware,

  viewUserProfile,

  dashboardFeed,
  dashboardPosts,
  dashboardEntries,
  dashboardSettings,
  dashboardPassword,
  dashboardEntryImport,

  registerForm,
  doRegister,
  loginForm,
  doLogin,
  doLogout,

  passwordRecoveryRequest,
  passwordRecovery
}

async function dashboardMiddleware (req, res, next) {
  res.locals.pageTitle = 'User dashboard'

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
    res.locals.pageTitle = profileUser.get('title')
    res.locals.pageDescription = forms.markdownToText(profileUser.related('details').get('body'))

    let [entries, posts] = await Promise.all([
      eventService.findUserEntries(profileUser),
      postService.findPosts({userId: profileUser.get('id')}),
      profileUser.load('details')
    ])

    res.render('user/profile', {
      profileUser,
      entries,
      posts
    })
  } else {
    res.errorPage(404, 'No user exists with name ' + req.params.name)
  }
}

/**
 * View comment feed
 */
async function dashboardFeed (req, res) {
  let dashboardUser = res.locals.dashboardUser

  // if an entry is not in the cache it will return undefined
  let userCache = cache.user(dashboardUser)
  let byUserCollection = userCache.get('byUserCollection')
  let toUserCollection = userCache.get('toUserCollection')
  let latestEntry = userCache.get('latestEntry')
  let latestPostsCollection = userCache.get('latestPostsCollection')

  if (!byUserCollection) {
    byUserCollection = await postService.findCommentsByUser(dashboardUser)
    userCache.set('byUserCollection', byUserCollection)
  }
  if (!toUserCollection) {
    toUserCollection = await postService.findCommentsToUser(dashboardUser)
    userCache.set('toUserCollection', toUserCollection)
  }
  if (!latestEntry) {
    latestEntry = await eventService.findLatestUserEntry(dashboardUser)
    userCache.set('latestEntry', latestEntry)
  }
  if (!latestPostsCollection) {
    latestPostsCollection = await postService.findPosts({
      userId: dashboardUser.id
    })
    userCache.set('latestPostsCollection', latestPostsCollection)
  }
  let invitesCollection = await eventService.findEntryInvitesForUser(dashboardUser, {
    withRelated: ['entry.event', 'entry.userRoles', 'invited']
  })

  let notificationsLastRead = dashboardUser.get('notifications_last_read')
  if (!res.locals.dashboardAdminMode) {
    dashboardUser.set('notifications_last_read', new Date())
    await dashboardUser.save()
    userCache.del('unreadNotifications')
    res.locals.unreadNotifications = 0
  }

  // TODO Limit at the SQL-level
  res.render('user/dashboard-feed', {
    byUser: byUserCollection.take(20),
    toUser: toUserCollection.take(20),
    latestEntry,
    latestPosts: latestPostsCollection.take(3),
    invites: invitesCollection.models,
    notificationsLastRead
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
 * Manage user entries
 */
async function dashboardEntries (req, res) {
  let entryCollection = await eventService.findUserEntries(res.locals.user)
  res.render('user/dashboard-entries', {
    entries: entryCollection.models
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
    let dashboardUser = res.locals.dashboardUser
    if (req.body.delete) {
      // Account deletion
      let result = await userService.deleteUser(res.locals.dashboardUser)
      if (!result.error) {
        await req.session.regeneratePromisified()
        res.locals.user = null
        res.redirect('/')
        return
      } else {
        errorMessage = result.error
      }
    } else {
      if (!forms.isEmail(req.body.email)) {
        errorMessage = 'Invalid email'
      } else if (req.body['social_web'] && !forms.isURL(req.body['social_web'])) {
        errorMessage = 'Invalid URL'
      } else if (!res.locals.dashboardAdminMode && req.body['special-permissions']) {
        errorMessage = 'Not allowed to change special permissions on this user'
      } else if (!res.locals.dashboardAdminMode && req.body['disallow-anonymous']) {
        errorMessage = 'Not allows to change anonymous comments settings on this user'
      } else if (req.file.avatar && !(await fileStorage.isValidPicture(req.file.path))) {
        errorMessage = 'Invalid picture format (allowed: PNG GIF JPG)'
      }

      if (!errorMessage) {
        // General settings form
        dashboardUser.set('title', forms.sanitizeString(req.body.title || dashboardUser.get('name')))
        dashboardUser.set('email', req.body.email)
        if (req.body['special-permissions']) {
          let isMod = req.body['special-permissions'] === 'mod' || req.body['special-permissions'] === 'admin'
          let isAdmin = req.body['special-permissions'] === 'admin'
          dashboardUser.set({
            'is_mod': isMod ? 'true' : '',
            'is_admin': isAdmin ? 'true' : ''
          })
        }

        if (res.locals.dashboardAdminMode) {
          dashboardUser.set('disallow_anonymous', req.body['disallow-anonymous'] === 'on')
        }

        let dashboardUserDetails = dashboardUser.related('details')
        dashboardUserDetails.set('social_links', {
          website: req.body.website,
          twitter: forms.sanitizeString(req.body.twitter.replace('@', ''))
        })
        dashboardUserDetails.set('body', forms.sanitizeMarkdown(req.body.body, constants.MAX_BODY_USER_DETAILS))
        await dashboardUserDetails.save()

        if (dashboardUser.hasChanged('title')) {
          await userService.refreshUserReferences(dashboardUser)
        }

        if (req.file || req.body['avatar-delete']) {
          let avatarPath = '/user/' + dashboardUser.get('id')
          await fileStorage.savePictureToModel(dashboardUser, 'avatar', req.file, req.body['avatar-delete'], avatarPath, { maxDiagonal: 500 })
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
    let dashboardUser = res.locals.dashboardUser

    // Change password form
    if (!res.locals.dashboardAdminMode && !req.body['password']) {
      errorMessage = 'You must enter your current password'
    } else if (!res.locals.dashboardAdminMode && !await userService.authenticate(dashboardUser.get('name'), req.body['password'])) {
      errorMessage = 'Current password is incorrect'
    } else if (!req.body['new-password']) {
      errorMessage = 'You must enter a new password'
    } else if (req.body['new-password'] !== req.body['new-password-bis']) {
      errorMessage = 'New passwords do not match'
    } else {
      let result = userService.setPassword(dashboardUser, req.body['new-password'])
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

async function dashboardEntryImport (req, res) {
  let context = {
    availableImporters: entryImportService.getAvailableImporters()
  }

  if (req.method === 'POST') {
    context.importer = forms.sanitizeString(req.body.importer)
    context.profileIdentifier = forms.sanitizeString(req.body.profileIdentifier)
    context.oauthIdentifier = forms.sanitizeString(req.body.oauthIdentifier)

    let entryIds = req.body.entries
    if (!Array.isArray(entryIds)) {
      entryIds = entryIds ? [entryIds] : []
    }

    let importerProfileIdentifier = context.profileIdentifier || context.oauthIdentifier
    if (req.body.run) {
      try {
        let result
        for (let entryId of entryIds) {
          result = await entryImportService.createOrUpdateEntry(res.locals.user, context.importer, importerProfileIdentifier, entryId)
          if (result.error) {
            throw new Error(result.error)
          }
        }
        context.infoMessage = 'Successfully imported ' + entryIds.length + ' ' + (entryIds.length === 1 ? 'entry' : 'entries') + '!'
      } catch (e) {
        context.errorMessage = 'Error happened during entry import: ' + e.message + '. Import may have been partially done, please check your Entries page.'
      }
    } else if (entryIds.length > 0) {
      context.errorMessage = 'You must confirm the games are yours before importing them (see checkbox at the bottom).'
    }

    if (importerProfileIdentifier) {
      context.entryReferences = await entryImportService.fetchEntryReferences(res.locals.user, context.importer, importerProfileIdentifier)
    }
  }

  res.render('user/dashboard-entry-import', context)
}

/**
 * Register form
 */
async function registerForm (req, res) {
  res.locals.pageTitle = 'Register'
  res.render('register')
}

/**
 * Register
 */
async function doRegister (req, res) {
  res.locals.pageTitle = 'Register'

  let errorMessage = null
  if (!(req.body.name && req.body.password && req.body.email)) {
    errorMessage = 'A field is missing'
  } else if (!forms.isUsername(req.body.name)) {
    errorMessage = 'Your usename is too weird (either too short, or has special chars other than "_" or "-", or starts with a number)'
  } else if (req.body.password !== req.body['password-bis']) {
    errorMessage = 'Passwords do not match'
  } else {
    let result = await userService.register(req.body.email, req.body.name, req.body.password)
    if (result === true) {
      doLogin(req, res)
    } else {
      errorMessage = result
    }
  }

  if (errorMessage) {
    req.body.errorMessage = errorMessage
    res.render('register', req.body)
  }
}

/**
 * Login form
 */
async function loginForm (req, res) {
  res.locals.pageTitle = 'Login'

  res.render('login', {
    redirect: forms.sanitizeString(req.query.redirect)
  })
}

/**
 * Login
 */
async function doLogin (req, res) {
  res.locals.pageTitle = 'Login'

  let context = {
    redirect: forms.sanitizeString(req.body.redirect)
  }
  if (req.body.name && req.body.password) {
    let user = await userService.authenticate(req.body.name, req.body.password)
    if (user) {
      context.user = user
      context.infoMessage = 'Authentication successful'

      req.session.userId = user.get('id')
      if (req.body['remember-me']) {
        req.session.cookie.maxAge = constants.REMEMBER_ME_MAX_AGE
      }
      await req.session.savePromisified()
    } else {
      context.errorMessage = 'Authentication failed'
    }
  } else {
    context.errorMessage = 'Username or password missing'
  }

  if (!context.errorMessage && context.redirect) {
    res.redirect(context.redirect)
  } else {
    res.render('login', context)
  }
}

/**
 * Logout
 */
async function doLogout (req, res) {
  res.locals.pageTitle = 'Login'

  await req.session.regeneratePromisified()
  res.locals.user = null
  res.render('login', {
    infoMessage: 'Logout successful.'
  })
}

async function passwordRecoveryRequest (req, res) {
  let errorMessage = null

  if (res.locals.user) {
    res.redirect('/')
    return
  }

  if (req.method === 'POST') {
    if (!forms.isEmail(req.body.email)) {
      errorMessage = 'Invalid email address'
    }

    if (!errorMessage) {
      try {
        await userService.sendPasswordRecoveryEmail(res.app, req.body.email)
        res.locals.success = true
      } catch (err) {
        errorMessage = err.message
      }
    }
  }

  res.render('password-recovery-request', {
    errorMessage
  })
}

/**
 * Password change page, following the click on a password recovery link.
 */
async function passwordRecovery (req, res) {
  let errorMessage = null

  if (res.locals.user) {
    res.redirect('/')
    return
  }

  if (userService.validatePasswordRecoveryToken(res.app, req.query.token)) {
    res.locals.token = true

    if (req.method === 'POST') {
      if (!req.body['new-password']) {
        errorMessage = 'You must enter a new password'
      } else if (req.body['new-password'] !== req.body['new-password-bis']) {
        errorMessage = 'New passwords do not match'
      } else {
        let result = await userService.setPasswordUsingToken(res.app, req.query.token, req.body['new-password'])
        if (result === true) {
          res.locals.success = true
        } else {
          errorMessage = result
        }
      }
    }
  }

  res.render('password-recovery', {
    errorMessage
  })
}
