'use strict'

/**
 * Blog post pages
 *
 * @module controllers/post-controller
 */

const moment = require('moment')
const constants = require('../core/constants')
const forms = require('../core/forms')
const postService = require('../services/post-service')
const eventService = require('../services/event-service')
const securityService = require('../services/security-service')
const templating = require('./templating')
const Post = require('../models/post-model')

module.exports = {
  handleSaveComment,

  postMiddleware,

  editPost,
  savePost,
  viewPost,
  deletePost,

  saveComment
}

async function postMiddleware (req, res, next) {
  if (req.params.postId && req.params.postId !== 'create') {
    if (forms.isId(req.params.postId)) {
      res.locals.post = await postService.findPostById(req.params.postId)
    }
    if (!res.locals.post) {
      res.errorPage(404, 'Post not found')
      return
    }
  }

  next()
}

async function viewPost (req, res) {
  // Check permissions
  let post = res.locals.post
  if (postService.isPast(res.locals.post.get('published_at')) ||
      securityService.canUserRead(res.locals.user, post, { allowMods: true })) {
    let context = {
      sortedComments: await postService.findCommentsSortedForDisplay(post)
    }

    // Attach related entry/event
    if (post.get('event_id')) {
      await post.load(['event', 'entry', 'entry.userRoles'])
      if (post.related('event').id) {
        context.relatedEvent = post.related('event')
      }
      if (post.related('entry').id && !post.get('special_post_type')) {
        context.relatedEntry = post.related('entry')
      }
    }

    res.render('post/view-post', context)
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
      post.set('special_post_type', req.query['special_post_type'])
      res.locals.post = post
    }

    // Fetch related event/entry
    let post = res.locals.post
    let context = {}
    if (post.get('event_id')) {
      context.relatedEvent = await eventService.findEventById(post.get('event_id'))
    }
    if (post.get('entry_id')) {
      context.relatedEntry = await eventService.findEntryById(post.get('entry_id'))
    }
    context.specialPostType = forms.sanitizeString(post.get('special_post_type'))

    // Late post attachment to entry
    if (!post.get('special_post_type') && post.get('event_id') && !post.get('entry_id')) {
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
    post.set('title', forms.sanitizeString(fields.title))
    post.set('body', forms.sanitizeMarkdown(fields.body))
    post.set('event_id', forms.sanitizeString(fields['event_id']))
    post.set('entry_id', forms.sanitizeString(fields['entry_id']))

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

/**
 * Save or delete a comment
 */
async function saveComment (req, res) {
  let {fields} = await req.parseForm()
  let redirectUrl = await handleSaveComment(fields, res.locals.user, res.locals.post, templating.buildUrl(res.locals.post, 'post'))
  res.redirect(redirectUrl)
}

/**
 * Handler for handling the comment saving form.
 * Reusable between all controllers of models supporting comments.
 * @param {object} fields The parsed form fields
 * @param {User} user The current user
 * @param {Post|Entry} node The current node model
 * @param {string} baseUrl The view URL for the current node
 * @return {string} A URL to redirect to
 */
async function handleSaveComment (fields, currentUser, currentNode, baseUrl) {
  let redirectUrl = baseUrl

  // Find or create comment
  let comment = null
  let isNewComment = false
  if (fields.id) {
    if (forms.isId(fields.id)) {
      comment = await postService.findCommentById(fields.id)
    } else {
      return redirectUrl
    }
  } else {
    isNewComment = true
    comment = await postService.createComment(currentUser, currentNode)
  }

  if (securityService.canUserWrite(currentUser, comment, { allowMods: true })) {
    // Update or delete comment
    if (fields.delete) {
      await comment.destroy()
    } else {
      comment.set('body', forms.sanitizeMarkdown(fields.body))
      await comment.save()
      redirectUrl += templating.buildUrl(comment, 'comment')
    }

    // Update node comment count
    if (fields.delete || isNewComment) {
      await postService.refreshCommentCount(currentNode)
    }
  }

  return redirectUrl
}
