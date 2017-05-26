'use strict'

/**
 * Blog post pages
 *
 * @module controllers/post-controller
 */

const moment = require('moment')
const constants = require('../core/constants')
const postService = require('../services/post-service')
const eventService = require('../services/event-service')
const securityService = require('../services/security-service')
const templating = require('./templating')
const Post = require('../models/post-model')

module.exports = {
  postMiddleware,
  editPost,
  savePost,
  viewPost,
  deletePost
}

async function postMiddleware (req, res, next) {
  if (req.params.postId && req.params.postId !== 'create') {
    res.locals.post = await postService.findPostById(req.params.postId)
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
  // Check permissions
  if (postService.isPast(res.locals.post.get('published_at')) ||
      securityService.canUserRead(res.locals.user, res.locals.post, { allowMods: true })) {
    res.render('post/view-post')
  } else {
    res.errorPage(403)
  }
}

async function editPost (req, res) {
  let createMode = !res.locals.post
  if (createMode || securityService.canUserWrite(res.locals.user, res.locals.post, { allowMods: true })) {
    if (createMode) {
      let post = new Post()
      post.set('event_id', req.query.eventId)
      post.set('entry_id', req.query.entryId)
      res.locals.post = post
    }

    // Fetch related event/entry
    let post = res.locals.post
    let context = {}
    if (post.get('event_id')) {
      context.event = await eventService.findEventById(post.get('event_id'))
    }
    if (post.get('entry_id')) {
      context.entry = await eventService.findEntryById(post.get('entry_id'))
    }

    // Late post attachment to entry
    if (post.get('event_id') && !post.get('entry_id')) {
      context.entry = await eventService.findUserEntryForEvent(
        res.locals.user, context.event.get('id'))
    }

    res.render('post/edit-post', context)
  } else {
    res.errorPage(403)
  }
}

async function savePost (req, res) {
  let post = res.locals.post

  // Check permissions
  if ((post && securityService.canUserWrite(res.locals.user, post, { allowMods: true })) ||
      !(post && res.locals.user)) {
    // Create new post if needed
    if (!post) {
      post = await postService.createPost(res.locals.user)
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
    post.set('event_id', fields['event_id'])
    post.set('entry_id', fields['entry_id'])

    // Publication strategy
    let redirectToView = true
    if (fields.publish) {
      post.set('published_at', new Date())
    } else if (fields.unpublish) {
      post.set('published_at', null)
      redirectToView = false
    } else if (fields['save-custom']) {
      post.set('published_at', moment(fields['published-at'], constants.PICKER_DATE_TIME_FORMAT).toDate())
    }

    // Save
    await post.save()

    // Render
    if (redirectToView) {
      res.redirect(templating.buildUrl(post, 'post')) // TODO move buildUrl to routing-service
    } else {
      res.render('post/edit-post', { post })
    }
  } else {
    res.errorPage(403)
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

async function deletePost (req, res) {
  await res.locals.post.destroy()
  res.redirect('/')
}
