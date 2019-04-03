
export default function tooltips(selector) {
  $(selector).each(function() {
    const $this = $(this);
    $this.attr("data-delay", '{"show":"300", "hide":"0"}');
    $this.tooltip();
  });
}
