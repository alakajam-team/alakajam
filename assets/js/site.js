/**
 * JavaScript bundle root to be served up to the browser.
 */

/* eslint-env jquery */

// This is transformed by babel-env-preset into a list of requires for only
// those polyfills that are needed for our target set of browsers. For details,
// see: https://babeljs.io/docs/plugins/preset-env#optionsuse-built-ins
require('babel-polyfill')

$(function domReady () {
  require('./common/date-picker')('.js-date-picker')
  require('./common/disabled-links')('a.disabled')
  require('./common/editor')('.simplemde-editor', '.codemirror')
  require('./common/tooltips')('.has-tooltip')
  require('./common/warn-on-unsaved-changes')('.js-warn-on-unsaved-changes', { autoSubmit: '.js-auto-submit' })
  require('./common/lazy-images')('.js-lazy, .user-contents img')
  require('./common/select')()
  require('./common/show-hide')('.js-show', '.js-hide')
  require('./common/show-if-nonempty')('.js-show-if-nonempty')
  require('./common/shrink-navbar')()
  require('./common/sync-text')('.js-sync-text')
  require('./common/sync-slug')('.js-sync-slug')
  require('./common/tabs')({ buttonContainerSelector: '.js-tab-container', buttonSelector: '.js-tab-button', tabSelector: '.js-tab' })

  require('./countdown')('.js-countdown')

  require('./entry/edit-entry-division')()
  require('./entry/edit-entry-external')()
  require('./entry/edit-entry-links')()
  require('./entry/edit-entry-platforms')()
  require('./entry/edit-entry-team')()
  require('./entry/view-entry-voting')()

  require('./event/theme-ideas')()
  require('./event/theme-votes')()
  require('./event/theme-shortlist')()
})
