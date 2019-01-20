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
const likeService = require('../services/like-service')
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
  likePost,

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
 * General paginated posts browsing
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
    userLikes: await likeService.findUserLikeInfo(posts, res.locals.user),
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
    // Fetch comments and likes
    let context = await buildPostContext(post)
    context.sortedComments = await postService.findCommentsSortedForDisplay(post)
    if (res.locals.user) {
      context.userLikes = await likeService.findUserLikeInfo([post], res.locals.user)
    }

    // Guess social thumbnail pic
    context.pageImage = postService.getFirstPicture(post)
    if (context.pageImage && context.pageImage.indexOf('://') === -1) {
      context.pageImage = templating.staticUrl(context.pageImage)
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
      post.set('special_post_type', forms.sanitizeString(req.query['special_post_type']) || null)
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
    let title = forms.sanitizeString(req.body.title)
    let body = forms.sanitizeMarkdown(req.body.body, { maxLength: constants.MAX_BODY_POST })
    let errorMessage = null
    let customPublishDate = null

    if (req.body['save-custom']) {
      customPublishDate = forms.parseDateTime(req.body['published-at'])
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
      const eventIdIsValid = forms.isId(req.body['event-id'])

      // Create new post if needed
      if (!post) {
        post = await postService.createPost(
          res.locals.user,
          eventIdIsValid ? req.body['event-id'] : undefined
        )
      }

      // Fill post from form info
      post.set('title', title)
      post.set('body', body)
      let specialPostType = req.query['special_post_type'] || req.body['special-post-type'] || null
      if (securityService.isMod(res.locals.user)) {
        validateSpecialPostType(specialPostType, res.locals.user)
        post.set('special_post_type', specialPostType)
      }
      if (eventIdIsValid) {
        post.set('event_id', req.body['event-id'])
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
      if (req.body.publish) {
        post.set('published_at', new Date())
      } else if (req.body.unpublish) {
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
  // Fetch related event & entry info
  let context = {
    post,
    allEvents: (await eventService.findEvents()).models
  }
  if (post.get('event_id')) {
    context.relatedEvent = await eventService.findEventById(post.get('event_id'))
  }
  if (post.related('entry').id && !post.get('special_post_type')) {
    context.relatedEntry = post.related('entry')
  }
  context.specialPostType = post.get('special_post_type')
  return context
}

function validateSpecialPostType (specialPostType, user) {
  if (specialPostType && constants.SPECIAL_POST_TYPES.indexOf(specialPostType) === -1) {
    throw new Error('invalid special post type: ' + specialPostType)
  }
  if (specialPostType && !securityService.isMod(user)) {
    throw new Error('non-mod ' + user.get('name') + ' attempted to create a ' + specialPostType + ' post')
  }
}

async function deletePost (req, res) {
  let { user, post } = res.locals

  if (user && post && securityService.canUserManage(user, post, { allowMods: true })) {
    await postService.deletePost(post)
  }
  res.redirect('/')
}

/**
 * Likes a post
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
 * Likes or unlikes a post
 */
async function likePost (req, res) {
  let {user, post} = res.locals

  if (user) {
    if (req.body.like && likeService.isValidLikeType(req.body.like)) {
      await likeService.like(post, user.get('id'), req.body.like)
    } else if (req.body.unlike) {
      await likeService.unlike(post, user.get('id'))
    }
  }

  if (req.body.ajax) {
    res.render('post/ajax-likes', {
      post: await postService.findPostById(post.get('id')),
      userLikes: await likeService.findUserLikeInfo([post], user)
    })
  } else {
    res.redirect(req.query.redirect || templating.buildUrl(post, 'post'))
  }
}

/**
 * Save or delete a comment
 */
async function saveComment (req, res) {
  let redirectUrl = await handleSaveComment(req.body, res.locals.user, res.locals.post, templating.buildUrl(res.locals.post, 'post'))
  res.redirect(redirectUrl)
}

/**
 * Handler for handling the comment saving form.
 * Reusable between all controllers of models supporting comments.
 * @param {object} reqBody The parsed request body
 * @param {User} user The current user
 * @param {Post|Entry} node The current node model
 * @param {string} baseUrl The view URL for the current node
 * @param {Event} currentEvent The current event, if the node is an entry
 * @return {string} A URL to redirect to
 */
async function handleSaveComment (reqBody, currentUser, currentNode, baseUrl, currentEvent) {
  let redirectUrl = baseUrl

  // Validate comment body
  let commentBody = forms.sanitizeMarkdown(reqBody.body, { maxLength: constants.MAX_BODY_COMMENT })
  if (!currentUser || !commentBody) {
    return redirectUrl
  }

  // Check permissions, then update/create/delete comment
  let comment = null
  let isCreation = false
  let isDeletion = reqBody.delete
  let hasWritePermissions = false
  let nodeType = null
  let userId = null
  if (reqBody.id) {
    if (forms.isId(reqBody.id)) {
      comment = await postService.findCommentById(reqBody.id)
      hasWritePermissions = securityService.canUserManage(currentUser, comment, { allowMods: true }) ||
          (comment && await postService.isOwnAnonymousComment(comment, currentUser))
    }

    if (hasWritePermissions) {
      if (isDeletion) {
        // Delete comment
        nodeType = comment.get('node_type')
        userId = comment.get('user_id')
        await postService.deleteComment(comment)
      } else {
        // Update comment
        comment.set('body', commentBody)
        await comment.save()
      }
    } else {
      return redirectUrl
    }
  } else {
    isCreation = true
    hasWritePermissions = true
    comment = await postService.createComment(currentUser, currentNode, commentBody, reqBody['comment-anonymously'])
  }

  // Comment repercussions
  if (hasWritePermissions) {
    nodeType = nodeType || comment.get('node_type')
    userId = userId || comment.get('user_id')

    // Entry-specific updates
    if (nodeType === 'entry') {
      if (isCreation) {
        if (!currentUser.get('disallow_anonymous') && reqBody['comment-anonymously'] && currentNode.get('allow_anonymous')) {
          comment.set('user_id', -1)
          await db.knex('anonymous_comment_user').insert({
            'comment_id': comment.get('id'),
            'user_id': userId
          })
        }
        await eventService.refreshCommentKarma(comment)
        await comment.save()
      } else {
        // This change might impact the karma of other comments, refresh them
        await eventService.refreshUserCommentKarmaOnNode(currentNode, userId)
      }

      // Refresh karma on both the giver & receiver entries
      if (currentEvent) {
        let currentEntry = currentNode
        let userEntry = await eventService.findUserEntryForEvent(currentUser, currentEntry.get('event_id'))
        await eventRatingService.refreshEntryKarma(currentEntry, currentEvent)
        if (userEntry) {
          await eventRatingService.refreshEntryKarma(userEntry, currentEvent)
        }
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
    let commentBody = comment.get('body')
    if (typeof commentBody === 'string') {
      commentBody.split(' ').forEach(function (word) {
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
