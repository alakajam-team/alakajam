'use strict'

/**
 * Entry pages
 *
 * @module controllers/entry-controller
 */

const fileStorage = require('../core/file-storage')
const forms = require('../core/forms')
const models = require('../core/models')
const eventService = require('../services/event-service')
const eventRatingService = require('../services/event-rating-service')
const postService = require('../services/post-service')
const securityService = require('../services/security-service')
const platformService = require('../services/platform-service')
const settingService = require('../services/setting-service')
const tagService = require('../services/tag-service')
const highscoreService = require('../services/highscore-service')
const eventTournamentService = require('../services/event-tournament-service')
const likeService = require('../services/like-service')
const templating = require('./templating')
const postController = require('./post-controller')
const cache = require('../core/cache')
const constants = require('../core/constants')
const enums = require('../core/enums')

module.exports = {
  entryMiddleware,

  viewEntry,
  editEntry,
  deleteEntry,
  leaveEntry,

  saveCommentOrVote,

  viewScores,
  submitScore,
  editScores,

  acceptInvite,
  declineInvite,

  searchForTeamMate,
  searchForExternalEvents,
  searchForTags
}

/**
 * Fetches the current entry & event
 */
async function entryMiddleware (req, res, next) {
  let entry = await eventService.findEntryById(req.params.entryId)
  if (!entry) {
    res.errorPage(404, 'Entry not found')
    return
  }
  res.locals.entry = entry
  res.locals.pageTitle = entry.get('title')
  res.locals.pageDescription = entry.get('description') || forms.markdownToText(entry.related('details').get('body'))
  if (entry.get('pictures') && entry.get('pictures').length > 0) {
    res.locals.pageImage = templating.staticUrl(entry.get('pictures')[0])
  }

  if (req.params.eventName !== 'external-entry' &&
      (req.params.eventName !== entry.get('event_name') || req.params.entryName !== entry.get('name'))) {
    res.redirect(templating.buildUrl(entry, 'entry', req.params.rest))
    return
  }

  next()
}

/**
 * Browse entry
 */
async function viewEntry (req, res) {
  const { user, entry } = res.locals

  // Let the template display user thumbs
  await entry.load('userRoles.user')

  // Check voting phase
  let eventVote = eventRatingService.areVotesAllowed(res.locals.event)

  // Fetch vote on someone else's entry
  let vote
  let canVote = false
  if (res.locals.user && eventVote &&
      !securityService.canUserWrite(res.locals.user, entry)) {
    canVote = await eventRatingService.canVoteOnEntry(res.locals.user, entry)
    if (canVote) {
      vote = await eventRatingService.findEntryVote(res.locals.user, entry)
    }
  }

  // Count votes
  let entryVotes = await eventRatingService.countEntryVotes(entry)
  let minEntryVotes = null
  if (res.locals.user && securityService.canUserWrite(res.locals.user, entry)) {
    minEntryVotes = parseInt(await settingService.find(constants.SETTING_EVENT_REQUIRED_ENTRY_VOTES, '10'))
  }

  let editableAnonComments = null
  if (res.locals.user && entry.get('allow_anonymous')) {
    editableAnonComments = await postService.findOwnAnonymousCommentIds(res.locals.user, entry.get('id'), 'entry')
  }

  let posts = await postService.findPosts({
    entryId: entry.get('id')
  })

  let userScore = null
  let userLikes = null
  if (user) {
    userScore = await highscoreService.findEntryScore(user.get('id'), entry.get('id'))
    userLikes = await likeService.findUserLikeInfo(posts, user)
  }

  res.render('entry/view-entry', {
    sortedComments: await postService.findCommentsSortedForDisplay(entry),
    editableAnonComments,
    posts,
    entryVotes,
    minEntryVotes,
    vote,
    canVote,
    eventVote,
    external: !res.locals.event,
    highScoresCollection: await highscoreService.findHighScores(entry),
    userScore,
    userLikes,
    tournamentEvent: await eventTournamentService.findActiveTournamentPlaying(entry.get('id'))
  })
}

async function editEntry (req, res) {
  let {entry, event, user} = res.locals

  // Security checks
  if (!user) {
    res.redirect('/login?redirect=' + req.url)
    return
  } else if (!entry && event) {
    let existingEntry = await eventService.findUserEntryForEvent(user, event.id)
    if (existingEntry) {
      // User with an entry went to the creation URL, redirect him
      res.redirect(templating.buildUrl(existingEntry, 'entry', 'edit'))
      return
    } else if (!eventService.areSubmissionsAllowed(event)) {
      res.errorPage(403, 'Submissions are closed for this event')
      return
    } else {
      // Creation (in event)
      entry = new models.Entry({
        event_id: res.locals.event.get('id'),
        event_name: res.locals.event.get('name'),
        division: event.get('status_entry') === enums.EVENT.STATUS_ENTRY.OPEN_UNRANKED
          ? enums.DIVISION.UNRANKED : eventService.getDefaultDivision(event)
      })
    }
  } else if (!entry) {
    // Creation (external event)
    entry = new models.Entry({
      division: 'solo'
    })
  }

  if (entry.get('id') && !securityService.canUserWrite(user, entry, { allowMods: true })) {
    res.errorPage(403)
    return
  }

  let isPlayedInTournament = await eventTournamentService.findActiveTournamentPlaying(entry.get('id'))
  let errorMessage = res.locals.errorMessage

  if (req.method === 'POST') {
    // Parse form data
    let isExternalEvent = req.body['external-event'] !== undefined || !event
    let links = []
    let i = 0
    if (req.body['submit-links']) {
      while (req.body['url' + i]) {
        let label = forms.sanitizeString(req.body['label' + i])
        let url = req.body['url' + i]
        links.push({
          label,
          url
        })
        i++
      }
    } else {
      // If the client-side JS didn't have the time to load, don't change the links
      links = entry.get('links') || []
    }

    let platforms = null
    if (req.body.platforms) {
      // Ensure the requested platforms (if any) are valid before proceeding.
      let platformNames = (Array.isArray(req.body.platforms)) ? req.body.platforms : [req.body.platforms]
      platformNames = platformNames.map(tag => forms.sanitizeString(tag))
      platforms = await platformService.fetchMultipleNamed(platformNames)
      if (platforms.length < platformNames.length) {
        errorMessage = 'One or more platforms are invalid'
      } else {
        entry.set('platforms', platforms.map(p => p.get('name')))
      }
    }

    // Create model if needed
    let isCreation
    if (!entry.get('id')) {
      entry = await eventService.createEntry(user, event)
      isCreation = true
    } else {
      isCreation = false
    }

    // Save tags
    let tags = (Array.isArray(req.body.tags)) ? req.body.tags : [req.body.tags]
    tags = tags.map(tag => forms.sanitizeString(tag))
    await tagService.updateEntryTags(entry, tags)

    // Update entry

    let statusHighScore = 'off'
    if (req.body['enable-high-score'] === 'on') {
      statusHighScore = req.body['high-score-reversed'] ? enums.ENTRY.STATUS_HIGH_SCORE.REVERSED : enums.ENTRY.STATUS_HIGH_SCORE.NORMAL
    }

    entry.set({
      'title': forms.sanitizeString(req.body.title),
      'description': forms.sanitizeString(req.body.description),
      'links': links,
      'allow_anonymous': req.body['anonymous-enabled'] === 'on',
      'status_high_score': statusHighScore
    })

    if (isExternalEvent) {
      entry.set({
        event_id: null,
        event_name: null,
        published_at: forms.parseDateTime(req.body['published-at']) || null,
        external_event: forms.sanitizeString(req.body['external-event'])
      })
    }

    if (req.body['picture-delete'] && entry.get('pictures').length > 0) {
      await fileStorage.remove(entry.get('pictures')[0])
      entry.set('pictures', [])
    } else if (req.file && (await fileStorage.isValidPicture(req.file.path))) {
      let picturePath = '/entry/' + entry.get('id')
      let result = await fileStorage.savePictureUpload(req.file, picturePath)
      if (!result.error) {
        entry.set('pictures', [result.finalPath])
        if (!entry.hasChanged('pictures')) {
          // Make sure to make pictures URLs change for caching purposes
          entry.set('updated_at', new Date())
        }
      } else {
        errorMessage = result.error
      }
    } else if (req.body.picture) {
      entry.set('pictures', [forms.sanitizeString(req.body.picture)])
    }

    // Update entry details

    let optouts = []
    if (req.body['optout-graphics']) optouts.push('Graphics')
    if (req.body['optout-audio']) optouts.push('Audio')

    let highScoreType = forms.sanitizeString(req.body['high-score-type'], 20)
    if (highScoreType === 'custom') {
      highScoreType = forms.sanitizeString(req.body['custom-unit'], 20)
    }

    let entryDetails = entry.related('details')
    entryDetails.set({
      'optouts': optouts,
      'body': forms.sanitizeMarkdown(req.body.body, constants.MAX_BODY_ENTRY_DETAILS),
      'high_score_type': highScoreType,
      'high_score_instructions': forms.sanitizeString(req.body['high-score-instructions'], 2000)
    })

    // Save entry: Validate form data
    for (let link of links) {
      if (!forms.isURL(link.url) || !link.label) {
        errorMessage = 'Link #' + i + ' is invalid'
        break
      }
    }

    if (isPlayedInTournament && statusHighScore === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
      errorMessage = 'Cannot disable high scores while the game is featured in an active tournament'
    } else if (!forms.isLengthValid(links, 1000)) {
      errorMessage = 'Too many links (max allowed: around 7)'
    } else if (!entry && !isExternalEvent && !eventService.areSubmissionsAllowed(event)) {
      errorMessage = 'Submissions are closed for this event'
    } else if (req.body.division && !isExternalEvent && event && !forms.isIn(req.body.division, Object.keys(event.get('divisions')))) {
      errorMessage = 'Invalid division'
    }

    if (!errorMessage) {
      // Save entry: Prepare team changes
      let teamMembers = null
      if (req.body.members) {
        if (!Array.isArray(req.body.members)) {
          req.body.members = [req.body.members]
        }
        teamMembers = req.body.members.map(s => parseInt(s))
        let ownerId
        if (!isCreation) {
          ownerId = entry.related('userRoles')
            .findWhere({ permission: constants.PERMISSION_MANAGE })
            .get('user_id')
        } else {
          ownerId = res.locals.user.get('id')
        }
        if (!teamMembers.includes(ownerId)) {
          teamMembers.push(ownerId)
        }
      }

      // Manager-only changes
      if (isCreation || securityService.canUserManage(user, entry, { allowMods: true })) {
        let division = req.body['division'] || eventService.getDefaultDivision(event)
        if (event &&
          (event.get('status_entry') === enums.EVENT.STATUS_ENTRY.OPEN_UNRANKED || event.get('status_entry') === enums.EVENT.STATUS_ENTRY.CLOSED)) {
          if (!entry.has('division')) {
            // New entries are all unranked
            division = enums.DIVISION.UNRANKED
          } else {
            // Existing entries cannot change division
            division = entry.get('division')
          }
        }
        entry.set('division', division)

        res.locals.infoMessage = ''
        if (teamMembers !== null) {
          let teamChanges = await eventService.setTeamMembers(user, entry, teamMembers)
          if (teamChanges.numAdded > 0) {
            res.locals.infoMessage += teamChanges.numAdded + ' user(s) have been sent an invite to join your team. '
          }
          if (teamChanges.numRemoved > 0) {
            res.locals.infoMessage += teamChanges.numRemoved + ' user(s) have been removed from the team.'
          }
        }
      }

      // Save entry: Persist changes and side effects
      let eventCountRefreshNeeded = event && (isCreation || entry.hasChanged('division') || entry.hasChanged('published_at'))
      await entryDetails.save()
      if (entry.hasChanged('status_high_score') && entry.get('status_high_score') !== enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
        highscoreService.refreshEntryRankings(entry) // corner case: owner toggles lower-is-better after some scores are submitted
      }
      entry.set('published_at', entry.get('published_at') || new Date())
      await entry.save()
      if (eventCountRefreshNeeded) {
        eventService.refreshEventCounts(event) // No need to await
      }

      // Set or remove platforms.
      platformService.setEntryPlatforms(entry, platforms || [], { updateEntry: false })
      cache.user(res.locals.user).del('latestEntry')
      await entry.load(['userRoles.user', 'comments', 'details', 'tags'])

      // Save entry: Redirect to view upon success
      res.redirect(templating.buildUrl(entry, 'entry'))
      return
    }
  }

  res.render('entry/edit-entry', {
    entry,
    members: await eventService.findTeamMembers(entry, res.locals.user),
    allPlatforms: await platformService.fetchAllNames(),
    entryPlatforms: entry.get('platforms'),
    external: !res.locals.event,
    tags: entry.related('tags').map(tag => ({ id: tag.id, value: tag.get('value') })),
    isPlayedInTournament,
    errorMessage
  })
}

/**
 * Deletes an entry
 */
async function deleteEntry (req, res) {
  let { entry, event, user } = res.locals

  if (user && entry && securityService.canUserManage(user, entry, { allowMods: true })) {
    await entry.load('posts')
    entry.related('posts').forEach(async function (post) {
      post.set('entry_id', null)
      await post.save()
    })
    await eventService.deleteEntry(entry)
    if (event) {
      eventService.refreshEventCounts(event) // No need to await
    }
    cache.user(res.locals.user).del('latestEntry')
  }

  if (event) {
    res.redirect(templating.buildUrl(event, 'event'))
  } else {
    res.redirect(templating.buildUrl(user, 'user', 'entries'))
  }
}

/**
 * Leaves the team of an entry
 */
async function leaveEntry (req, res) {
  let { entry, user } = res.locals

  if (user && entry) {
    // Remove requesting user from the team
    let newTeamMembers = []
    entry.related('userRoles').each(function (userRole) {
      if (userRole.get('user_id') !== user.get('id')) {
        newTeamMembers.push(userRole.get('user_id'))
      }
    })
    await eventService.setTeamMembers(user, entry, newTeamMembers)

    cache.user(user).del('latestEntry')
  }

  if (res.locals.event) {
    res.redirect(templating.buildUrl(res.locals.event, 'event'))
  } else {
    res.redirect(templating.buildUrl(res.locals.user, 'user', 'entries'))
  }
}

/**
 * Saves a comment or vote made to an entry
 */
async function saveCommentOrVote (req, res) {
  let {entry, event, user} = res.locals

  // Security checks
  if (!user) {
    res.errorPage(403)
    return
  }

  if (req.body['action'] === 'comment') {
    // Save comment
    let redirectUrl = await postController.handleSaveComment(
      req.body, user, entry, templating.buildUrl(entry, 'entry'), event)
    res.redirect(redirectUrl)
  } else if (req.body['action'] === 'vote') {
    // Save vote
    let i = 1
    let votes = []
    while (req.body['vote-' + i] !== undefined) {
      votes.push(req.body['vote-' + i])
      i++
    }
    if (await eventRatingService.canVoteOnEntry(res.locals.user, res.locals.entry)) {
      await eventRatingService.saveEntryVote(res.locals.user, res.locals.entry, res.locals.event, votes)
    }
    viewEntry(req, res)
  }
}

/**
 * Browse entry scores
 */
async function viewScores (req, res) {
  let { user, entry } = res.locals

  if (entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    res.errorPage(403, 'High scores are disabled on this entry')
    return
  }

  let entryScore
  if (user) {
    entryScore = await highscoreService.findEntryScore(user.get('id'), entry.get('id'))
  }

  res.render('entry/view-scores', {
    entryScore,
    highScoresCollection: await highscoreService.findHighScores(entry, { fetchAll: true }),
    tournamentEvent: await eventTournamentService.findActiveTournamentPlaying(entry.get('id'))
  })
}

/**
 * Submit a high score
 */
async function submitScore (req, res) {
  let { user, entry } = res.locals

  if (!user) {
    res.redirect('/login?redirect=' + req.url)
    return
  } else if (entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    res.errorPage(403, 'High scores are disabled on this entry')
    return
  }

  // Fetch existing score, handle deletion
  let entryScore = await highscoreService.findEntryScore(user.get('id'), entry.get('id'))
  if (req.method === 'POST' && req.body.delete && entryScore) {
    await highscoreService.deleteEntryScore(entryScore, entry)
    entryScore = null
  }
  if (!entryScore) {
    entryScore = await highscoreService.createEntryScore(user.get('id'), entry.get('id'))
  }

  let rankingPercent
  if (entryScore.get('ranking')) {
    rankingPercent = Math.floor(100 * entryScore.get('ranking') / entry.related('details').get('high_score_count'))
  }

  // Score submission
  let errorMessage
  if (req.method === 'POST' && !req.body.delete) {
    // Validation
    let isExternalProof = req.body.proof !== 'upload'
    let score = forms.sanitizeString(req.body.score) || '0'
    score = score.replace(/,/g, '.').replace(/ /g, '') // give some flexibility to number parsing

    if (req.body['score-mn'] || req.body['score-s'] || req.body['score-ms']) {
      let minutes = req.body['score-mn'] || 0
      let seconds = req.body['score-s'] || 0
      let milliseconds = req.body['score-ms'] || 0

      if (!forms.isInt(minutes, { min: 0, max: 999 })) {
        errorMessage = 'Invalid minutes'
        minutes = 0
      }
      if (!forms.isInt(seconds, { min: 0, max: 59 })) {
        errorMessage = 'Invalid seconds'
        seconds = 0
      }
      if (!forms.isInt(milliseconds, { min: 0, max: 999 })) {
        errorMessage = 'Invalid milliseconds'
        milliseconds = 0
      }
      score = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) * 0.001
    } else if (!forms.isFloat(score)) {
      errorMessage = 'Invalid score'
    }
    if (isExternalProof && req.body.proof && !forms.isURL(req.body.proof)) {
      errorMessage = 'Invalid proof URL'
    }

    // Store score & proof
    entryScore.set('score', score)
    if (isExternalProof) {
      entryScore.set('proof', forms.sanitizeString(req.body.proof))
    } else {
      if (req.file || req.body['upload-delete']) {
        let proofPath = `/scores/${entry.get('id')}/${entryScore.get('user_id')}`
        let result = await fileStorage.savePictureToModel(entryScore, 'proof', req.file, req.body['upload-delete'], proofPath)
        if (result.error) {
          errorMessage = result.error
        }
      } else {
        entryScore.set('proof', req.body.upload)
      }
    }

    // Saving
    if (!errorMessage) {
      let result = await highscoreService.submitEntryScore(entryScore, entry)
      if (result.error) {
        errorMessage = result.error
      } else {
        entryScore = result
      }

      if (!errorMessage && req.query.redirectTo) {
        res.redirect(req.query.redirectTo)
        return
      }
    }
  }

  // Force header to the featured event if a tournament is on, to make navigation less confusing
  let tournamentEvent = await eventTournamentService.findActiveTournamentPlaying(entry.get('id'))
  if (tournamentEvent) {
    res.locals.event = res.locals.featuredEvent
  }

  // Build context
  let context = {
    highScoresCollection: await highscoreService.findHighScores(entry),
    tournamentEvent,
    entryScore,
    rankingPercent,
    errorMessage,
    isExternalProof: highscoreService.isExternalProof(entryScore)
  }
  if (entry.related('details').get('high_score_type') === 'time') {
    // Parse time
    let durationInSeconds = entryScore.get('score')
    if (durationInSeconds) {
      context.scoreMn = Math.floor(durationInSeconds / 60)
      context.scoreS = Math.floor(durationInSeconds) - context.scoreMn * 60
      context.scoreMs = Math.round(1000 * (durationInSeconds - Math.floor(durationInSeconds)))
    }
  }

  res.render('entry/submit-score', context)
}

/**
 * Moderate high scores
 */
async function editScores (req, res) {
  let { user, entry } = res.locals

  if (!user) {
    res.redirect('/login?redirect=' + req.url)
    return
  } else if (!securityService.canUserWrite(user, entry, { allowMods: true })) {
    res.errorPage(403)
    return
  } else if (entry.get('status_high_score') === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    res.errorPage(403, 'High scores are disabled on this entry')
    return
  }

  if (req.method === 'POST') {
    for (let field in req.body) {
      if (field.includes('suspend') || field.includes('restore')) {
        let parsedField = field.split('-')
        let id = parsedField.length === 2 ? parsedField[1] : null
        if (id && forms.isId(id)) {
          await highscoreService.setEntryScoreActive(id, field.includes('restore'))
        }
      } else if (field === 'clearall') {
        await highscoreService.deleteAllEntryScores(entry)
      }
    }
  }

  res.render('entry/edit-scores', {
    highScoresCollection: await highscoreService.findHighScores(entry, {
      fetchAll: true,
      withSuspended: true
    })
  })
}

/**
 * Accept an invite to join an entry's team
 */
async function acceptInvite (req, res) {
  await eventService.acceptInvite(res.locals.user, res.locals.entry)
  res.redirect(templating.buildUrl(res.locals.entry, 'entry'))
}

/**
 * Decline an invite to join an entry's team
 */
async function declineInvite (req, res) {
  await eventService.deleteInvite(res.locals.user, res.locals.entry)
  res.redirect(templating.buildUrl(res.locals.user, 'user', 'feed'))
}

/**
 * Search for team mates with usernames matching a string
 * @param {string} req.query.name a string to search user names with.
 */
async function searchForTeamMate (req, res) {
  let errorMessage
  if (!req.query || !req.query.name) {
    errorMessage = 'No search parameter'
  }
  const nameFragment = forms.sanitizeString(req.query.name)
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`
  } else if (req.query.entryId && !forms.isId(req.query.entryId)) {
    errorMessage = 'Invalid entry ID'
  }

  if (!errorMessage) {
    let entry = null
    if (req.query.entryId) {
      entry = await eventService.findEntryById(req.query.entryId)
    }

    const matches = await eventService.searchForTeamMembers(nameFragment,
      res.locals.event ? res.locals.event.id : null, entry)

    const entryId = entry ? entry.get('id') : -1
    const getStatus = (match) => {
      switch (match.node_id) {
        case null: return 'available'
        case entryId: return 'member'
        default: return 'unavailable'
      }
    }

    const responseData = {
      matches: matches.map(match => ({
        id: match.id,
        text: match.title,
        avatar: match.avatar,
        status: getStatus(match)
      }))
    }
    res.json(responseData)
  } else {
    res.status(400).json({ error: errorMessage })
  }
}

/**
 * AJAX endpoint : Finds external event names
 */
async function searchForExternalEvents (req, res) {
  let errorMessage

  if (!req.query || !req.query.name) {
    errorMessage = 'No search parameter'
  }
  const nameFragment = forms.sanitizeString(req.query.name)
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`
  }

  if (!errorMessage) {
    let results = await eventService.searchForExternalEvents(nameFragment)
    res.json(results)
  } else {
    res.status(400).json({ error: errorMessage })
  }
}

/**
 * AJAX endpoint : Finds tags
 */
async function searchForTags (req, res) {
  let errorMessage

  if (!req.query || !req.query.name) {
    errorMessage = 'No search parameter'
  }
  const nameFragment = forms.sanitizeString(req.query.name)
  if (!nameFragment || nameFragment.length < 3) {
    errorMessage = `Invalid name fragment: '${req.query.name}'`
  }

  if (!errorMessage) {
    let matches = await tagService.searchTags(nameFragment)

    const responseData = {
      matches: matches.map(match => ({
        id: match.id,
        value: match.value
      }))
    }
    res.json(responseData)
  } else {
    res.status(400).json({ error: errorMessage })
  }
}
