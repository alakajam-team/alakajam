
export default function editEntryDivision() {
  $(".js-entry-divisions").each(function() {
    const $entryDivisions = $(this);

    const divisionButtonSelector = ".js-division-button";

    const initialDivision = $entryDivisions.attr("data-initial-division");

    $entryDivisions.find("label").each((i, el) => {
      const $el = $(el);
      const $input = $el.find("input");
      const active = $input.val() === initialDivision;
      $input.prop("checked", active);
      $el.toggleClass("active", active);
    });
    $entryDivisions.find(divisionButtonSelector).click(function() {
      // XXX avoid depending on IDs outside our own component
      $("#edit-team").toggleClass("hidden", $(this).find("input").val() === "solo");
      $("#edit-optouts").toggleClass("hidden", $(this).find("input").val() === "unranked");
    });

    // Show warning upon not being a team entry anymore

    // XXX avoid depending on IDs outside our own component
    $("#js-edit-entry-form").submit((ev) => {
      if (initialDivision !== "solo" && $('input[name="division"]:checked').val() === "solo" &&
          !window.confirm("You are about to switch to a Solo entry. All team members will be removed. Continue?")) {
        ev.preventDefault();
      }
    });
  });
}
