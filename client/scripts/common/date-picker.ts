/**
 * Date pickers use the Tempus Dominus library
 * https://tempusdominus.github.io/bootstrap-4/
 */

export default function datePicker(selector: string): void {
  $(selector).each((i, element) => {
    const $element = $(element);
    $element.datetimepicker({
      format: $element.attr("data-format"),
      icons: {
        time: "fa fa-clock"
      }
    });
  });
}
