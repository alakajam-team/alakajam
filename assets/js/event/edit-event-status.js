/* eslint-env jquery */

function refreshEventStatusToggles (value) {
  let showOtherStatus = value === 'disabled'
  $('#js-edit-event-status-jam').toggle(showOtherStatus)
}

module.exports = function editEventStatus () {
  $('input[type=radio][name=status-tournament]').on('change, ifChecked', function () {
    refreshEventStatusToggles($(this).val())
  })
  refreshEventStatusToggles($('input[type=radio][name=status-tournament]:checked').val())
}
