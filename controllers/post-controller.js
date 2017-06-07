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
  postMiddleware,

  editPost,
  savePost,
  viewPost,
  deletePost,

  saveComment
}

async function postMiddleware (req, res, next) {
  if (req.params.postId && req.params.postId !== 'create') {
    // Fetch current post
    if (forms.isId(req.params.postId)) {
      res.locals.post = await postService.findPostById(req.params.postId)
    }
    if (!res.locals.post) {
      res.errorPage(404, 'Post not found')
      return
    }

    // Fetch comment to edit
    if (req.query.editComment) {
      if (forms.isId(req.query.editComment)) {
        res.locals.editComment = await postService.findCommentById(req.query.editComment)
      }
      if (!securityService.canUserWrite(res.locals.user, res.locals.editComment, { allowMods: true })) {
        res.errorPage(403, 'Cannot edit this comment')
        return
      }
    }
  }

  next()
}

async function viewPost (req, res) {
  // Check permissions
  let post = res.locals.post
  if (postService.isPast(res.locals.post.get('published_at')) ||
      securityService.canUserRead(res.locals.user, post, { allowMods: true })) {
    let context = {}

    // Attach sorted comments
    await post.load(['comments', 'comments.user'])
    context.sortedComments = post.related('comments')
          .sortBy(comment => comment.get('created_at'))

    // Attach related entry/event
    if (post.get('event_id')) {
      await post.load(['event', 'entry', 'entry.userRoles'])
      if (post.related('event').id) {
        context.event = post.related('event')
      }
      if (post.related('entry').id) {
        context.entry = post.related('entry')
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
  let redirectUrl = templating.buildUrl(res.locals.post, 'post')
  let {fields} = await req.parseForm()

  // Find or create comment
  let comment = null
  let isNewComment = false
  if (fields.id) {
    if (forms.isId(fields.id)) {
      comment = await postService.findCommentById(fields.id)
    } else {
      res.errorPage(404, 'Comment not found')
      return
    }
  } else {
    isNewComment = true
    comment = await postService.createComment(res.locals.user, res.locals.post)
  }

  if (securityService.canUserWrite(res.locals.user, comment, { allowMods: true })) {
    // Update or delete comment
    if (fields.delete) {
      await comment.destroy()
    } else {
      comment.set('body', forms.sanitizeMarkdown(fields.body))
      await comment.save()
      redirectUrl += templating.buildUrl(comment, 'comment')
    }

    // Update post comment count
    if (fields.delete || isNewComment) {
      await postService.refreshCommentCount(res.locals.post)
    }
  }

  res.redirect(redirectUrl)
}
