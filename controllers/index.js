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

    // Run all middleware before any actual route handlers

    router.use('*', mainController.anyPageMiddleware)
    router.use('/admin*', adminController.adminMiddleware)
    // Why `{0,}` instead of `*`? See: https://github.com/expressjs/express/issues/2495
    router.use('/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?/:rest*?', entryController.entryMiddleware)
    router.use('/:eventName([^/]{0,}-[^/]{0,})', eventController.eventMiddleware)
    router.use('/post/:postId', postController.postMiddleware)
    router.use('/post/:postId/*', postController.postMiddleware)

    // General

    router.get('/', mainController.index)
    router.get('/events', mainController.events)
    router.get('/people', mainController.people)
    router.get('/chat', mainController.chat)

    // Users

    router.get('/register', userController.registerForm)
    router.post('/register', userController.doRegister)
    router.get('/login', userController.loginForm)
    router.post('/login', userController.doLogin)
    router.get('/logout', userController.doLogout)

    router.use('/dashboard*', userController.dashboardMiddleware)
    router.all('/dashboard/feed', userController.dashboardFeed)
    router.all('/dashboard/posts', userController.dashboardPosts)
    router.all('/dashboard/invite', userController.dashboardInvite)
    router.all('/dashboard/settings', userController.dashboardSettings)
    router.all('/dashboard/password', userController.dashboardPassword)
    router.get('/user/:name', userController.viewUserProfile)

    // Mod dashboard

    router.get('/admin', adminController.adminHome)
    router.get('/admin/articles', adminController.adminArticles)
    router.get('/admin/events', adminController.adminEvents)
    router.get('/admin/users', adminController.adminUsers)
    router.all('/admin/dev', adminController.adminDev)
    router.all('/admin/status', adminController.adminStatus)

    // Events & Entries

    router.get('/:eventName([^/]{0,}-[^/]{0,})/create-entry', entryController.createEntry)
    router.post('/:eventName([^/]{0,}-[^/]{0,})/create-entry', entryController.saveEntry)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?', entryController.viewEntry)
    router.post('/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName?', entryController.saveEntry)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/edit', entryController.editEntry)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/:entryId(\\d+)/:entryName/delete', entryController.deleteEntry)

    router.get('/create-event', eventController.editEvent)
    router.post('/create-event', eventController.editEvent)
    router.get('/:eventName([^/]{0,}-[^/]{0,})', eventController.viewEventPosts)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/announcements', eventController.viewEventAnnouncements)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/themes', eventController.viewEventThemes)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/games', eventController.viewEventGames)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/results', eventController.viewEventResults)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/edit', eventController.editEvent)
    router.post('/:eventName([^/]{0,}-[^/]{0,})/edit', eventController.editEvent)
    router.get('/:eventName([^/]{0,}-[^/]{0,})/delete', eventController.deleteEvent)

    // Posts

    router.get('/posts', postController.posts)
    router.get('/article/:name', postController.article)

    router.get('/post/create', postController.editPost)
    router.post('/post/create', postController.savePost)
    router.get('/post/:postId', postController.viewPost)
    router.get('/post/:postId(\\d+)/:postName?', postController.viewPost)
    router.post('/post/:postId(\\d+)/:postName?', postController.saveComment)
    router.post('/post/:postId(\\d+)/:postName/edit', postController.savePost)
    router.get('/post/:postId(\\d+)/:postName/edit', postController.editPost)
    router.get('/post/:postId(\\d+)/:postName/delete', postController.deletePost)
  }

}
