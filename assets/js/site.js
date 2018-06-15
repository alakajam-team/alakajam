/**
 * JavaScript bundle root to be served up to the browser.
 */

/* eslint-env jquery */

$(function domReady () {
  require('./common/check-all-none')('.js-check-all', '.js-check-none')
  require('./common/date-picker')('.js-date-picker')
  require('./common/disabled-links')('a.disabled')
  require('./common/editor')('.easymde-editor', '.codemirror')
  require('./common/expand-collapse')()
  require('./common/fixed-digits')()
  require('./common/form-submit')()
  require('./common/icheck')()
  require('./common/lazy-images')('.js-lazy, .user-contents img')
  require('./common/radio-text-field')()
  require('./common/select')()
  require('./common/show-hide')('.js-show', '.js-hide')
  require('./common/show-if-nonempty')('.js-show-if-nonempty')
  require('./common/shrink-navbar')()
  require('./common/sync-slug')('.js-sync-slug')
  require('./common/sync-text')('.js-sync-text')
  require('./common/tabs')({ buttonContainerSelector: '.js-tab-container', buttonSelector: '.js-tab-button', tabSelector: '.js-tab' })
  require('./common/tags-select')()
  require('./common/tooltips')('.has-tooltip')
  require('./common/user-select')()
  require('./common/warn-on-unsaved-changes')('.js-warn-on-unsaved-changes', { autoSubmit: '.js-auto-submit' })

  require('./countdown')('.js-countdown')

  require('./entry/edit-entry-division')()
  require('./entry/edit-entry-external')()
  require('./entry/edit-entry-links')()
  require('./entry/edit-entry-platforms')()
  require('./entry/edit-entry-team')()
  require('./entry/edit-entry-highscore')()
  require('./entry/view-entry-voting')()

  require('./event/edit-event-status')()
  require('./event/theme-ideas')()
  require('./event/theme-votes')()
  require('./event/theme-shortlist')()

  require('./user/dashboard-entry-import')()
})
