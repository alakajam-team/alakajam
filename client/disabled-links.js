/* eslint-env jquery */

function init () {
  $('a.disabled').click(function (e) {
    e.preventDefault()
  })
}

module.exports = {
  init
}
