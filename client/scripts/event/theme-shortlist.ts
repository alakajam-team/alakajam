
import * as Sortable from "../../../node_modules/sortablejs/Sortable";

export default function themeShortlist() {
  const $shortlist = $("#js-shortlist");
  if ($shortlist.length === 0) {
    return;
  }
  const $shortlistVotes = $("#js-shortlist-votes");
  const $shortlistSubmit = $("#js-shortlist-submit");
  const handleSelector = ".theme-shortlist-line__handle";

  $(handleSelector).on("mouseenter", function() {
    $(this).parent().addClass("hovered");
  });
  $(handleSelector).on("mouseleave", function() {
    $(this).parent().removeClass("hovered");
  });

  Sortable.create($shortlist[0], {
    animation: 100,
    filter: ".not-sortable",
    handle: ".theme-shortlist-line__handle",
    forceFallback: true,
    fallbackClass: "theme-shortlist-line sortable-drag",
    fallbackOnBody: true,
    onUpdate() {
      const votes = [];
      $shortlist.find("li").each(function() {
        votes.push($(this).attr("data-theme-id"));
      });
      $shortlistVotes.val(votes);
      $shortlistSubmit
        .removeClass("disabled")
        .removeAttr("disabled");
    }
  });
}
