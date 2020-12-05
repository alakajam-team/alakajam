
function toggleHighScoreDetails(highScoreStatus) {
  $(".js-high-score-details").toggle(highScoreStatus === "on");
}

function toggleCustomUnitInput(unitType) {
  const disable = unitType !== "custom";
  $(".js-custom-unit-input").prop("readonly", disable);
  if (disable) {
    $(".js-custom-unit-input").val("");
  }
}

export default function editEntryHighScore(): void {
  // Toggle high score details
  $("input[type=radio][name=enable-high-score]").on("change, ifChecked", function() {
    const self = this as HTMLInputElement;
    toggleHighScoreDetails(self.value);
  });
  toggleHighScoreDetails($("input[type=radio][name=enable-high-score]:checked").val());

  // Toggle custom unit input
  $("input[type=radio][name=high-score-type]").on("change, ifChecked", function() {
    const self = this as HTMLInputElement;
    toggleCustomUnitInput(self.value);
  });
  toggleCustomUnitInput($("input[type=radio][name=high-score-type]:checked").val());
}
