
import * as Sortable from "../../../node_modules/sortablejs/Sortable";

export default function themeShortlist() {
  const $shortlist = $("#js-shortlist");
  if ($shortlist.length === 0) {
    return;
  }
  const $shortlistVotes = $("#js-shortlist-votes");
  const $shortlistSubmit = $("#js-shortlist-submit");

  Sortable.create($shortlist[0], {
    animation: 100,
    onUpdate() {
      const votes = [];
      $shortlist.find("li").each(() => {
        votes.push($(this).attr("data-theme-id"));
      });
      $shortlistVotes.val(votes);
      $shortlistSubmit
        .removeClass("disabled")
        .removeAttr("disabled");
    },
    onStart() {
      this.el.classList.remove("use-hover");
    },
    onEnd() {
      this.el.classList.add("use-hover");
    }
  });
}
