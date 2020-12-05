
/**
 * Example:
 * <div>
 *  <h1 id="title"></h1>
 *  <input type="text" class="js-sync-text"
 *    data-sync-text-display-selector="#title" data-sync-text-default="My title" />
 * </div>
 */
export default function syncText(): void {
  $(".js-sync-text")
    .on("change keyup", (event) => {
      const $input = $(event.target);
      const defaultText = $input.attr("data-sync-text-default");
      const text = $input.val().toString() || defaultText || "";
      const $display = $($input.attr("data-sync-text-display-selector"));
      $display.text(text);
    })
    .trigger("change");
}
