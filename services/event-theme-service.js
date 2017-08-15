'use strict'

/**
 * Service for managing theme voting.
 *
 * @module services/event-theme-service
 */

const models = require('../core/models')
const constants = require('../core/constants')
const log = require('../core/log')
const forms = require('../core/forms')

module.exports = {
  findThemeIdeasByUser,
  saveThemeIdeas,

  findThemeVotesHistory,
  findThemesToVoteOn,
  saveVote,
  
  findBestThemes
}

/**
 * Saves the theme ideas of an user for an event
 * @param user {User} user model
 * @param event {Event} event model
 * @param ideas {array(object)} An array of exactly 3 ideas (all fields optional): [{label, id}]
 */
async function findThemeIdeasByUser (user, event) {
  return models.Theme.where({
    user_id: user.get('id'),
    event_id: event.get('id')
  }).fetchAll()
}

/**
 * Saves the theme ideas of an user for an event
 * @param user {User} user model
 * @param event {Event} event model
 * @param ideas {array(object)} An array of exactly 3 ideas: [{title, id}]. Not filling the title
 * deletes the idea, not filling the ID creates one instead of updating it.
 */
async function saveThemeIdeas (user, event, ideas) {
  if (ideas.length !== 3) {
    throw new Error('there must be information for exactly 3 theme ideas')
  }

  let tasks = []

  // Run through all existing themes for that event/user combination
  let existingThemes = await findThemeIdeasByUser(user, event)
  let handledThemes = []
  for (let idea of ideas) {
    if (idea.id) {
      let existingTheme = existingThemes.findWhere({'id': parseInt(idea.id)})
      // We can only delete/update themes if they're active or cancelled because they're duplicates
      if (existingTheme && (existingTheme.get('status') === constants.THEME_STATUS_ACTIVE
          || existingTheme.get('status') === constants.THEME_STATUS_DUPLICATE)) {
        if (idea.title) {
          // Update existing theme if needed
          if (idea.title !== existingTheme.get('title')) {
            existingTheme.set({
              title: idea.title,
              status: constants.THEME_STATUS_ACTIVE,
              score: 0,
              notes: 0,
              reports: 0
            })
            await handleDuplicates(existingTheme)
            tasks.push(existingTheme.save())
          }
        } else {
          // Delete existing theme
          tasks.push(existingTheme.destroy())
        }
        handledThemes.push(existingTheme)
      } else {
        log.warn('Invalid theme ID for user ' + user.get('name') + ': ' + idea.id)
        idea.id = null
      }
    }

    if (!idea.id && idea.title) {
      // Create theme
      let theme = new models.Theme({
        user_id: user.get('id'),
        event_id: event.get('id'),
        title: idea.title,
        status: constants.THEME_STATUS_ACTIVE
      })
      await handleDuplicates(theme)
      tasks.push(theme.save())
    }
  }

  // Destroy any theme not among the ideas
  let missingThemes = existingThemes.difference(handledThemes)
  if (missingThemes.length > 0) {
    log.warn('Theme ID were not given among the parameters for user ' + user.get('name') + ':')
    for (let missingTheme of missingThemes) {
      log.warn(' - ' + missingTheme.get('id'))
      tasks.push(missingTheme.destroy())
    }
  }

  await Promise.all(tasks)
}

/**
 * Sets the theme status to "duplicate" if another theme is identical
 */
async function handleDuplicates (theme) {
  theme.set('slug', forms.slug(theme.get('title')))
  
  let query = models.Theme.where({
    slug: theme.get('slug'),
    event_id: theme.get('event_id')
  })
  if (theme.get('id')) {
    query = query.where('id', '<>', theme.get('id'))
  }
  if ((await query.fetch()) !== null) {
    theme.set('status', constants.THEME_STATUS_DUPLICATE)
  }
}

/**
 * Returns the 30 latest votes by the user
 * @param user {User} user model
 * @param event {Event} event model
 */
async function findThemeVotesHistory (user, event) {
  return models.ThemeVote.where({
    event_id: event.get('id'),
    user_id: user.get('id')
  })
      .orderBy('id', 'DESC')
      .fetchPage({
        pageSize: 30,
        withRelated: ['theme']
      })
}

/**
 * Returns a page of 10 themes that a user can vote on
 * @param user {User} user model
 * @param event {Event} event model
 */
async function findThemesToVoteOn (user, event) {
  return models.Theme.query(function (qb) {
      qb.leftOuterJoin('theme_vote', function () {
        this.on('theme.id', '=', 'theme_vote.theme_id')
        this.andOn('theme_vote.user_id', '=', user.get('id'))
      })
    })
      .where({
        status: constants.THEME_STATUS_ACTIVE,
        'theme.event_id': event.get('id'),
        'theme_vote.user_id': null
      })
      .where('theme.user_id', '<>', user.get('id'))
      .orderBy('notes', 'DESC')
      .fetchPage({ pageSize: 10 })
}

/**
 * Saves a theme vote
 * @param user {User} user model
 * @param event {Event} event model
 * @param themeId {integer}
 * @param score {integer}
 */
async function saveVote (user, event, themeId, score) {
  // TODO Refine theme statuses
  if (event.get('status_theme') === 'on' && [-1, 1].indexOf(score) !== -1) {
    let theme = await models.Theme.where('id', themeId).fetch()
    let vote = await models.ThemeVote.where({
      user_id: user.get('id'),
      event_id: event.get('id'),
      theme_id: themeId
    }).fetch()

    if (vote) {
      theme.set('score', theme.get('score') + score - (vote.get('score') || 0))
      vote.set('score', score)
    } else {
      theme.set({
        'score': theme.get('score') + score,
        'notes': theme.get('notes') + 1
      })
      vote = new models.ThemeVote({
        theme_id: themeId,
        user_id: user.get('id'),
        event_id: event.get('id'),
        score: score
      })
    }
    
    await Promise.all([theme.save(), vote.save()])
  }
}

async function findBestThemes (event, options) {
  let query =  models.Theme.where({
    event_id: event.get('id')
  }).orderBy('score', 'DESC')
  if (options.fetchAll) {
    return query.fetchAll()
  } else {
    return query.fetchPage({ pageSize: 10 })
  }
}