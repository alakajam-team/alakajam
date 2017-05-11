'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const db = require('../core/db')
const config = require('../config')
const postService = require('../services/post-service')

module.exports = {

  initRoutes: function (app) {
    app.use('/admin*', adminSecurity)
    app.all('/admin', adminHome)
    app.all('/admin/dev', adminDev)
  }

}

async function adminSecurity (req, res, next) {
  if ((!res.locals.user || !res.locals.user.get('is_admin')) && !config.DEBUG_ADMIN) {
    res.render('403')
  } else {
    next()
  }
}

/**
 * Edit home announcement
 */
async function adminHome (req, res) {
  let homePost = await postService.findHomePost()

  if (req.method === 'POST') {
    let {fields} = await req.parseForm()
    homePost.set('title', fields.title)
    homePost.set('body', fields.body)
    await homePost.save()
  }

  res.render('admin/admin-home', {
    homePost
  })
}

/**
 * Admin developer tools
 * TODO Make it only available in dev environments
 */
async function adminDev (req, res) {
  let {fields} = await req.parseForm()
  let infoMessage = '', errorMessage = ''
  if (fields['db_reset']) {
    await db.dropTables()
    await db.upgradeTables()
    await db.insertSamples()
    let version = await db.findCurrentVersion()
    infoMessage = 'DB reset done (current version : ' + version + ').'
  }
  res.render('admin/admin-dev', {
    infoMessage,
    errorMessage
  })
}
