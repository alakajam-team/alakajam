/* eslint-env jquery */
/* global slug */

module.exports = function syncSlug (inputSelector) {
  $(inputSelector)
    .on('change', function (event) {
      const $titleInput = $(event.target)
      const slugText = slug($titleInput.val()).toLowerCase()
      const $slugInput = $($titleInput.attr('data-sync-slug-input-selector'))
      $slugInput.val(slugText)
    })
}
