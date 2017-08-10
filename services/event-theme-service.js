'use strict'

/**
 * Service for managing theme voting.
 *
 * @module services/event-theme-service
 */

const models = require('../core/models')
const constants = require('../core/constants')
const log = require('../core/log')

module.exports = {
  findThemeIdeasByUser,
  saveThemeIdeas
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
  let keptThemes = []
  for (let idea of ideas) {
    if (idea.id) {
      let existingTheme = existingThemes.findWhere({'id': parseInt(idea.id)})
      // We can only delete/update themes while they're active
      if (existingTheme && existingTheme.get('status') === constants.THEME_STATUS_ACTIVE) {
        if (idea.title) {
          // Update existing theme
          existingTheme.set({
            'title': idea.title,
            'status': constants.THEME_STATUS_ACTIVE,
            'score': 0,
            'notes': 0,
            'reports': 0
          })
          tasks.push(existingTheme.save())
          keptThemes.push(existingTheme)
        } else {
          // Delete existing theme
          tasks.push(existingTheme.destroy())
        }
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
      tasks.push(theme.save())
    }
  }

  // Destroy any theme not among the ideas
  let missingThemes = existingThemes.difference(keptThemes)
  if (missingThemes.length > 0) {
    log.warn('Theme ID were not given among the parameters for user ' + user.get('name') + ':')
    for (let missingTheme of missingThemes) {
      log.warn(' - ' + missingTheme.get('id'))
      tasks.push(missingTheme.destroy())
    }
  }

  await Promise.all(tasks)
}
