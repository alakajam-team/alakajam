/**
 * JavaScript bundle root to be served up to the browser.
 */

/* eslint-env jquery */

// This is transformed by babel-env-preset into a list of requires for only
// those polyfills that are needed for our target set of browsers. For details,
// see: https://babeljs.io/docs/plugins/preset-env#optionsuse-built-ins
require('babel-polyfill')

window.alakajam = {
  common: {
    datePicker: require('./common/date-picker'),
    tabs: require('./common/tabs'),
    syncSlug: require('./common/sync-slug'),
    syncText: require('./common/sync-text')
  },
  event: {
    editEventThemes: require('./event/edit-event-themes')
  },
  post: {
    editPost: require('./post/edit-post')
  },
  countdown: require('./countdown')
}

$(function domReady () {
  require('./common/date-picker')('.js-date-picker')
  require('./common/disabled-links')('a.disabled')
  require('./common/editor')('.simplemde-editor')
  require('./common/tooltips')('.has-tooltip')
  require('./common/warn-on-unsaved-changes')('.js-warn-on-unsaved-changes', { autoSubmit: '.js-auto-submit' })
  require('./common/lazy-images')('.js-lazy, .user-contents img')
  require('./common/select')()
})
