/**
 * JavaScript bundle root to be served up to the browser.
 */

/* eslint-env jquery */

$(function domReady () {
  require('./disabled-links').init()
  require('./tooltips').init()
})
