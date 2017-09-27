/* eslint-env jquery */
/* global slug */

module.exports = function syncSlug (titleInputSelector, slugInputSelector) {
  const $titleInput = $(titleInputSelector)
  const $slugInput = $(slugInputSelector)
  $titleInput.on('change keyup', function () {
    $slugInput.val(slug($titleInput.val()).toLowerCase())
  })
}
