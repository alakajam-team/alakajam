
/**
 * Simple wrapper that lets you style <select> elements using the Select2
 * library by simply adding a `js-select` class.
 *
 * Configuration can be done through Select2's own API for data- attributes:
 * https://select2.org/configuration/data-attributes
 * Notable ones include `data-placeholder` and `data-allow-clear`.
 */
export default function select(): void {
  $(".js-select").each(function() {
    const $select = $(this);
    $select.select2();
  });

  $("select").on("select2:unselecting", function(ev: any) {
    if (ev.params.args.originalEvent) {
      // When unselecting (in multiple mode)
      ev.params.args.originalEvent.stopPropagation();
    } else {
      // When clearing (in single mode)
      $(this).one("select2:opening", (ev2) => { ev2.preventDefault(); });
    }
  });
}
