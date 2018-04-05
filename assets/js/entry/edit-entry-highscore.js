/* eslint-env jquery */

function toggleHighScoreDetails (highScoreStatus) {
  $('.js-high-score-details').toggle(highScoreStatus === 'on')
}

function toggleCustomUnitInput (unitType) {
  let disable = unitType !== 'custom'
  $('.js-custom-unit-input').prop('readonly', disable)
  if (disable) {
    $('.js-custom-unit-input').val('')
  }
}

module.exports = function editEntryHighScore () {
  // Toggle high score details
  $('input[type=radio][name=enable-high-score]').on('change, ifChecked', function () {
    toggleHighScoreDetails(this.value)
  })
  toggleHighScoreDetails($('input[type=radio][name=enable-high-score]:checked').val())

  // Toggle custom unit input
  $('input[type=radio][name=high-score-unit]').on('change, ifChecked', function () {
    toggleCustomUnitInput(this.value)
  })
  toggleCustomUnitInput($('input[type=radio][name=high-score-unit]:checked').val())
}
