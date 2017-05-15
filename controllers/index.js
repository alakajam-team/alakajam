'use strict'

/**
 * Controllers listing
 *
 * @module controllers
 */

module.exports = {

  initRoutes: function (app) {
    // Using express-promise-router instead of the default express.Router
    // allows our routes to return rejected promises to trigger the error
    // handling.
    const router = require('express-promise-router')()
    app.use(router)

    const adminController = require('./admin-controller.js')
    const entryController = require('./entry-controller.js')
    const eventController = require('./event-controller.js')
    const mainController = require('./main-controller.js')
    const postController = require('./post-controller.js')
    const userController = require('./user-controller.js')

    router.use('*', mainController.anyPageMiddleware)
    router.use('/admin*', adminController.adminMiddleware)
    router.use('/entry/:id*', entryController.entryMiddleware)
    router.use('/event/:eventId*', entryController.entryMiddleware)
    router.use('/event/:id*', eventController.eventMiddleware)
    router.use('/post/:id', postController.postMiddleware)

    router.get('/', mainController.index)
    router.get('/events', mainController.events)
    router.get('/chat', mainController.chat)

    router.get('/register', userController.registerForm)
    router.post('/register', userController.doRegister)
    router.get('/login', userController.loginForm)
    router.post('/login', userController.doLogin)
    router.get('/logout', userController.doLogout)
    router.all('/settings', userController.settingsGeneral)
    router.all('/settings/password', userController.settingsPassword)
    router.get('/user/:name', userController.viewUserProfile)

    router.get('/admin', adminController.adminHome)
    router.all('/admin/dev', adminController.adminDev)

    router.get('/event/:eventId/create-entry', entryController.createEntry)
    router.post('/event/:eventId/create-entry', entryController.saveEntry)
    router.get('/entry/:id', entryController.viewEntry)
    router.post('/entry/:id', entryController.saveEntry)
    router.get('/entry/:id/edit', entryController.editEntry)
    router.get('/entry/:id/delete', entryController.deleteEntry)

    router.get('/event/:id', eventController.viewEvent)

    router.get('/post/create', postController.editPost)
    router.post('/post/create', postController.savePost)
    router.get('/post/:id/edit', postController.editPost)
    router.post('/post/:id/edit', postController.savePost)
    router.get('/post/:id', postController.viewPost)
    router.get('/post/:id/delete', postController.deletePost)
  }

}
