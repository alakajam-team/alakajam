
export default function themeIdeas(): void {
  const $ideaDelete = $(".js-idea-delete");

  // XXX This is strongly dependent on the DOM structure. Would be better to
  // pass the appropriate selectors in through data attributes instead.
  $ideaDelete.click(function(e) {
    const $this = $(this);
    const $parent = $this.parent();
    const $target = $("input[type=text]", $parent);
    $target.removeAttr("readonly");
    $target.val("");
    $this.hide();
    $parent.removeClass("form-inline");
    $("p", $parent).hide();
    e.preventDefault();
  });
}
