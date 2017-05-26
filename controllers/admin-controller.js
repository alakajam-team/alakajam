'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const config = require('../config')
const db = require('../core/db')
const constants = require('../core/constants')
const postService = require('../services/post-service')

module.exports = {
  adminMiddleware,
  adminHome,
  adminStatus,
  adminDev
}

async function adminMiddleware (req, res, next) {
  if ((!res.locals.user || !res.locals.user.get('is_mod')) && !config.DEBUG_ADMIN) {
    res.errorPage(403)
  } else {
    next()
  }
}

/**
 * Edit home announcement
 */
async function adminHome (req, res) {
  let allPostsCollection = await postService.findPosts({
    specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
    withDrafts: true
  })
  let draftPosts = allPostsCollection.where({'published_at': null})
  res.render('admin/admin-home', {
    draftPosts,
    publishedPosts: allPostsCollection.difference(draftPosts)
  })
}

/**
 * Admin developer tools
 * TODO Make it only available in dev environments
 */
async function adminStatus (req, res) {
  if (res.locals.user.get('is_admin')) {
    let pictureResizeEnabled = false
    try {
      require('sharp')
      pictureResizeEnabled = true
    } catch (e) {
      // Nothing
    }

    res.render('admin/admin-status', {
      devMode: !!res.app.locals.devMode,
      pictureResizeEnabled
    })
  } else {
    res.errorPage(403)
  }
}

/**
 * Admin developer tools
 * TODO Make it only available in dev environments
 */
async function adminDev (req, res) {
  if (res.locals.user.get('is_admin')) {
    let infoMessage = ''
    let errorMessage = ''
    if (req.method === 'POST') {
      let {fields} = await req.parseForm()
      if (fields['db-reset']) {
        await db.dropTables()
        await db.upgradeTables()
        await db.insertSamples()
        let version = await db.findCurrentVersion()
        infoMessage = 'DB reset done (current version : ' + version + ').'
      }
    }
    res.render('admin/admin-dev', {
      infoMessage,
      errorMessage
    })
  } else {
    res.errorPage(403)
  }
}
