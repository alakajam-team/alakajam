'use strict'

/**
 * Blog post pages
 *
 * @module controllers/post-controller
 */

const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const templating = require('./templating')
const Post = require('../models/post-model')

module.exports = {

  initRoutes: function (app) {
    app.use('/post/:id', postMiddleware)

    app.get('/post/create', editPost)
    app.post('/post/create', savePost)
    app.get('/post/:id/edit', editPost)
    app.post('/post/:id/edit', savePost)
    app.get('/post/:id', viewPost)
  }

}

async function postMiddleware (req, res, next) {
  if (req.params.id && req.params.id !== 'create') {
    res.locals.post = await postService.findPostById(req.params.id)
    if (!res.locals.post) {
      res.errorPage(404, 'Post not found')
    } else {
      next()
    }
  } else {
    next()
  }
}

async function viewPost (req, res) {
  res.render('post/view-post')
}

async function editPost (req, res) {
  if (!res.locals.post) {
    res.locals.post = new Post()
  }
  res.render('post/edit-post')
}

async function savePost (req, res) {
  let post = res.locals.post

  // Check permissions
  if (post && securityService.canUserWrite(res.locals.user, post, { allowMods: true })
      || !post && res.locals.user) {

    // Create new post if needed
    let creation = false
    if (!post) {
      post = await postService.createPost(res.locals.user)
      creation = true
      let specialPostType = req.query['special_post_type']
      if (specialPostType) {
        validateSpecialPostType(specialPostType, res.locals.user)
        post.set('special_post_type', specialPostType)
      }
    }
    
    // Fill post from form info
    let {fields} = await req.parseForm()
    post.set('title', fields.title)
    post.set('body', fields.body)

    // Save
    if (!post.get('published_at')) {
      post.set('published_at', new Date())
    }
    await post.save()

    res.redirect(templating.buildUrl(post, 'post')) // TODO move buildUrl to routing-service
  } else {
    res.errorPage(403, 'Forbidden')
  }
}

function validateSpecialPostType (specialPostType, user) {
  if (['announcement'].indexOf(specialPostType) === -1) {
    throw new Error('invalid special post type: ' + specialPostType)
  }
  if (specialPostType === 'announcement' && !securityService.isMod(user)) {
    throw new Error('non-mod ' + user.get('name') + ' attempted to create an announcement')
  }
}