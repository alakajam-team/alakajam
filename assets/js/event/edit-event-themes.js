/* eslint-env jquery */

function initEliminationDetails () {
  const $startDate = $('input[name="elimination-start-date"]')
  const $eliminationDetails = $('#elimination-details')

  function toggleEliminationDetails () {
    var visible = !!$startDate.val()
    $eliminationDetails.toggle(visible)
  }

  $startDate.change(toggleEliminationDetails)
  toggleEliminationDetails()
}

module.exports = {
  initEliminationDetails
}
