export default function checkAllNone(checkAllSelector: string, checkNoneSelector: string): void {
  $(checkAllSelector).click(function() {
    const checkboxSelector = $(this).attr("data-check-all-selector");
    $(checkboxSelector).iCheck("check");
  });
  $(checkNoneSelector).click(function() {
    const checkboxSelector = $(this).attr("data-check-none-selector");
    $(checkboxSelector).iCheck("uncheck");
  });
}
