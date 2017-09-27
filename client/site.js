/**
 * JavaScript bundle root to be served up to the browser.
 */

/* eslint-env jquery */

// This is transformed by babel-env-preset into a list of requires for only
// those polyfills that are needed for our target set of browsers. For details,
// see: https://babeljs.io/docs/plugins/preset-env#optionsuse-built-ins
require('babel-polyfill')

module.exports = {
  common: {
    tabs: require('./common/tabs'),
    syncSlug: require('./common/sync-slug'),
    syncText: require('./common/sync-text')
  },
  post: {
    editPost: require('./post/edit-post')
  },
  countdown: require('./countdown')
}

$(function domReady () {
  require('./disabled-links').init()
  require('./tooltips').init()
})