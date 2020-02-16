
export default function editEntryDivision() {
  $(".js-entry-divisions").each(function() {
    const $entryDivisions = $(this);
    const divisionButtonSelector = ".js-division-button";
    const initialDivision = $entryDivisions.attr("data-initial-division");

    // Init selected division

    $entryDivisions.find("label").each((i, el) => {
      const $el = $(el);
      const $input = $el.find("input");
      const active = $input.val() === initialDivision;
      $input.prop("checked", active);
      $el.toggleClass("active", active);
    });

    toggleDivisionSpecificFields(initialDivision);

    // Toggle division-specific fields on click

    $entryDivisions.find(divisionButtonSelector).click(function() {
      // XXX avoid depending on IDs outside our own component
      const division = $(this).find("input").val().toString();
      toggleDivisionSpecificFields(division);
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

function toggleDivisionSpecificFields(division: string) {
  const isUnranked = division === "unranked";

  $("#edit-team").toggleClass("d-none", division === "solo");
  $("#edit-optouts").toggleClass("d-none", isUnranked);

  $("#accept-rules").toggleClass("d-none", isUnranked);
  $("#accept-rules").toggleClass("d-flex", !isUnranked);
  if (isUnranked) {
    $("input#accepted-rules").removeAttr("required");
  } else {
    $("input#accepted-rules").attr("required", "required");
  }
}
