'use strict'

/**
 * Global pages
 *
 * @module controllers/main-controller
 */

const db = require('../core/db')

module.exports = {

  initRoutes: function (app) {
    app.get('/admin', admin)
    app.get('/admin/reset', resetDb)
  }

}

/**
 * Admin page
 */
async function admin (req, res) {
  res.render('admin')
}

/**
 * XXX Temporary admin page
 * Resets the DB
 */
async function resetDb (req, res) {
  await db.dropTables()
  await db.upgradeTables()
  await db.insertSamples()
  let version = await db.findCurrentVersion()
  res.render('admin', {
    message: 'DB reset done (current version : ' + version + ').'
  })
}
