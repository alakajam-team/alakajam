'use strict'

/**
 * Blog post pages
 *
 * @module controllers/post-controller
 */

const constants = require('../core/constants')
const forms = require('../core/forms')
const models = require('../core/models')
const cache = require('../core/cache')
const postService = require('../services/post-service')
const eventService = require('../services/event-service')
const eventRatingService = require('../services/event-rating-service')
const securityService = require('../services/security-service')
const templating = require('./templating')
const db = require('../core/db')

module.exports = {
  handleSaveComment,

  postMiddleware,

  posts,

  editPost,
  savePost,
  viewPost,
  deletePost,
  watchPost,

  saveComment
}

async function postMiddleware (req, res, next) {
  if (req.params.postId && req.params.postId !== 'create') {
    if (forms.isId(req.params.postId)) {
      res.locals.post = await postService.findPostById(req.params.postId)
      if (res.locals.post && res.locals.post.get('event_id')) {
        res.locals.event = res.locals.post.related('event')
        if (res.locals.event) {
          res.locals.latestEventAnnouncement = await postService.findLatestAnnouncement({
            eventId: res.locals.event.get('id')
          })
        }
      }
    }

    if (res.locals.post) {
      res.locals.pageTitle = res.locals.post.get('title')
      res.locals.pageDescription = forms.markdownToText(res.locals.post.get('body'))
    } else {
      res.errorPage(404, 'Post not found')
      return
    }
  }

  next()
}

/**
 * Announcements listing
 */
async function posts (req, res) {
  // Fetch posts
  let specialPostType = forms.sanitizeString(req.query['special_post_type']) || null
  if (specialPostType === 'all') {
    specialPostType = undefined
  }
  let eventId = forms.sanitizeString(req.query['event_id']) || undefined
  let userId = forms.sanitizeString(req.query['user_id']) || undefined
  let currentPage = forms.isId(req.query.p) ? parseInt(req.query.p) : 1
  let posts = await postService.findPosts({
    specialPostType,
    eventId,
    userId,
    page: currentPage
  })
  await posts.load(['event', 'entry'])

  // Determine title
  let title = 'Posts'
  if (specialPostType === constants.SPECIAL_POST_TYPE_ANNOUNCEMENT) {
    title = 'Announcements'
  }
  res.locals.pageTitle = title

  // Determine base URL for pagination
  let paginationBaseUrl = '/posts?'
  if (specialPostType !== null) {
    paginationBaseUrl += '&special_post_type=' + req.query['special_post_type']
  }
  if (eventId) {
    paginationBaseUrl += '&event_id=' + eventId
  }
  if (userId) {
    paginationBaseUrl += '&user_id=' + userId
  }

  res.render('posts', {
    posts: posts.models,
    title,
    currentPage,
    pageCount: posts.pagination.pageCount,
    paginationBaseUrl
  })
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
  if (!res.locals.user) {
    res.redirect('/login?redirect=' + req.url)
    return
  }

  let createMode = !res.locals.post
  if (createMode || securityService.canUserWrite(res.locals.user, res.locals.post, { allowMods: true })) {
    if (createMode) {
      let post = new models.Post()
      post.set('special_post_type', forms.sanitizeString(req.query['special_post_type']))
      post.set('title', forms.sanitizeString(req.query.title))
      if (forms.isId(req.query.eventId)) {
        post.set('event_id', req.query.eventId)
      } else if (res.locals.featuredEvent) {
        post.set('event_id', res.locals.featuredEvent.get('id'))
      }
      if (forms.isId(req.query.entryId)) {
        post.set('entry_id', req.query.entryId)
      }

      res.locals.post = post
    }

    // Fetch related event info
    res.render('post/edit-post', await buildPostContext(res.locals.post))
  } else {
    res.errorPage(403)
  }
}

async function savePost (req, res) {
  let post = res.locals.post

  // Check permissions
  if ((post && securityService.canUserWrite(res.locals.user, post, { allowMods: true })) || (!post && res.locals.user)) {
    let redirectToView = false
    let {fields} = await req.parseForm()
    let title = forms.sanitizeString(fields.title)
    let body = forms.sanitizeMarkdown(fields.body, constants.MAX_BODY_POST)
    let errorMessage = null
    let customPublishDate = null

    if (fields['save-custom']) {
      customPublishDate = forms.parseDateTime(fields['published-at'])
      if (!customPublishDate) {
        errorMessage = 'Invalid scheduling time'
      }
    }
    if (!title) {
      errorMessage = 'Title is mandatory'
    }
    if (!body) {
      errorMessage = 'Empty posts are not allowed'
    }

    if (!errorMessage) {
      const eventIdIsValid = forms.isId(fields['event-id'])

      // Create new post if needed
      if (!post) {
        post = await postService.createPost(
          res.locals.user,
          eventIdIsValid ? fields['event-id'] : undefined
        )
        let specialPostType = req.query['special_post_type']
        if (specialPostType) {
          validateSpecialPostType(specialPostType, res.locals.user)
          post.set('special_post_type', specialPostType)
        }
      }

      // Fill post from form info
      post.set('title', title)
      post.set('body', body)
      if (eventIdIsValid) {
        post.set('event_id', fields['event-id'])
        if (post.hasChanged('event_id') || post.hasChanged('special_post_type')) {
          if (!post.get('special_post_type')) {
            await post.load(['userRoles', 'author'])

            // Update event ID on all roles
            for (let userRole of post.related('userRoles').models) {
              userRole.set('event_id', post.get('event_id'))
              await userRole.save()
            }

            // Figure out related entry from event + user
            let relatedEntry = await eventService.findUserEntryForEvent(
              post.related('author'), post.get('event_id'))
            post.set('entry_id', relatedEntry ? relatedEntry.get('id') : null)
          } else {
            // Clear entry on special posts
            post.set('entry_id', null)
          }
        }
      } else {
        post.set('event_id', null)
        post.set('entry_id', null)
      }

      // Publication & redirection strategy
      redirectToView = true
      if (fields.publish) {
        post.set('published_at', new Date())
      } else if (fields.unpublish) {
        post.set('published_at', null)
        redirectToView = false
      } else if (customPublishDate) {
        post.set('published_at', customPublishDate)
      }

      // Save
      await post.save()
      cache.user(res.locals.user).del('latestPostsCollection')
    } else if (!post) {
      post = new models.Post()
    }

    // Render
    if (redirectToView) {
      res.redirect(templating.buildUrl(post, 'post')) // TODO move buildUrl to routing-service
    } else {
      let context = await buildPostContext(post)
      context.errorMessage = errorMessage
      res.render('post/edit-post', context)
    }
  } else {
    res.errorPage(403)
  }
}

async function buildPostContext (post) {
  // Fetch related event info
  let context = {
    post,
    allEvents: (await eventService.findEvents()).models
  }
  if (post.get('event_id')) {
    context.relatedEvent = await eventService.findEventById(post.get('event_id'))
  }
  context.specialPostType = post.get('special_post_type')
  return context
}

function validateSpecialPostType (specialPostType, user) {
  if (constants.SPECIAL_POST_TYPES.indexOf(specialPostType) === -1) {
    throw new Error('invalid special post type: ' + specialPostType)
  }
  if (specialPostType && !securityService.isMod(user)) {
    throw new Error('non-mod ' + user.get('name') + ' attempted to create a ' + specialPostType + ' post')
  }
}

async function deletePost (req, res) {
  let post = res.locals.post

  if (res.locals.user && post && securityService.canUserManage(res.locals.user, post, { allowMods: true })) {
    // Delete user roles manually (no cascading)
    let post = res.locals.post
    await post.load('userRoles')
    post.related('userRoles').each(function (userRole) {
      userRole.destroy()
    })

    await post.destroy()
    cache.user(res.locals.user).del('latestPostsCollection')
  }
  res.redirect('/')
}

/**
 * Toggles watching a post
 */
async function watchPost (req, res) {
  let {user, post} = res.locals

  if (user) {
    if (securityService.isUserWatching(user, post)) {
      await securityService.removeUserRight(user, post, constants.PERMISSION_WATCH)
    } else {
      await securityService.addUserRight(user, post, 'post', constants.PERMISSION_WATCH)
    }
  }

  res.redirect('.')
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
 * @param {Event} currentEvent The current event, if the node is an entry
 * @return {string} A URL to redirect to
 */
async function handleSaveComment (fields, currentUser, currentNode, baseUrl, currentEvent) {
  let redirectUrl = baseUrl

  // Validate comment body
  let body = forms.sanitizeMarkdown(fields.body, constants.MAX_BODY_COMMENT)
  if (!currentUser || !body) {
    return redirectUrl
  }

  // Check permissions, then update/create/delete comment
  let comment = null
  let isCreation = false
  let isDeletion = fields.delete
  let hasWritePermissions = false
  if (fields.id) {
    if (forms.isId(fields.id)) {
      comment = await postService.findCommentById(fields.id)
      hasWritePermissions = securityService.canUserManage(currentUser, comment, { allowMods: true }) ||
          await postService.isOwnAnonymousComment(comment, currentUser)
    }

    if (hasWritePermissions) {
      if (isDeletion) {
        // Delete comment
        await postService.deleteComment(comment)
      } else {
        // Update comment
        comment.set('body', body)
        await comment.save()
      }
    } else {
      return redirectUrl
    }
  } else {
    isCreation = true
    hasWritePermissions = true
    comment = await postService.createComment(currentUser, currentNode, body, fields['comment-anonymously'])
  }

  // Comment repercussions
  if (hasWritePermissions) {
    let nodeType = comment.get('node_type')
    let userId = comment.get('user_id')

    // Entry-specific updates
    if (nodeType === 'entry') {
      if (isCreation) {
        if (!currentUser.get('disallow_anonymous') && fields['comment-anonymously'] && currentNode.get('allow_anonymous')) {
          comment.set('user_id', -1)
          await db.knex('anonymous_comment_user').insert({
            'comment_id': comment.get('id'),
            'user_id': userId
          })
        }
        await eventService.refreshCommentScore(comment)
        await comment.save()
      } else {
        // This change might impact the feedback score of other comments, refresh them
        await eventService.refreshUserCommentScoresOnNode(currentNode, userId)
      }

      // Refresh feedback score on both the giver & receiver entries
      let currentEntry = currentNode
      let userEntry = await eventService.findUserEntryForEvent(currentUser, currentEntry.get('event_id'))
      await eventRatingService.refreshEntryScore(currentEntry, currentEvent)
      if (userEntry) {
        await eventRatingService.refreshEntryScore(userEntry, currentEvent)
      }
    }

    // Cache invalidation: comment feed and unread notifications of users associated with the post/entry
    let userRoles = currentNode.related('userRoles')
    userRoles.forEach(function (userRole) {
      let userCache = cache.user(userRole.get('user_name'))
      userCache.del('toUserCollection')
      userCache.del('unreadNotifications')
    })

    // Cache invalidation: Users @mentioned in the comment
    let body = comment.get('body')
    if (typeof body === 'string') {
      body.split(' ').forEach(function (word) {
        if (word.length > 0 && word[0] === '@') {
          let userCache = cache.user(word.slice(1))
          userCache.del('toUserCollection')
          userCache.del('unreadNotifications')
        }
      })
    }

    // Cache invalidation: User's own comment history
    cache.user(currentUser.get('name')).del('byUserCollection')

    // Refresh node comment count
    if (isDeletion || isCreation) {
      await postService.refreshCommentCount(currentNode)
    }

    // Redirect to anchor
    if (!isDeletion) {
      redirectUrl += templating.buildUrl(comment, 'comment')
    }
  }

  return redirectUrl
}
