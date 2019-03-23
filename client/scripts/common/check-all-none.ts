export default function checkAllNone(checkAllSelector, checkNoneSelector) {
  $(checkAllSelector).click(function() {
    const checkboxSelector = $(this).attr("data-check-all-selector");
    $(checkboxSelector).iCheck("check");
  });
  $(checkNoneSelector).click(function() {
    const checkboxSelector = $(this).attr("data-check-none-selector");
    $(checkboxSelector).iCheck("uncheck");
  });
}
