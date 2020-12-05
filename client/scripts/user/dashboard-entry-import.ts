const $importer = $(".js-importer");

function refreshImporterForm() {
  const selected = $importer.find(":selected");

  $("#js-profile").hide();
  $("#js-oauth").hide();

  if (selected.val()) {
    if (selected.data("mode") === "oauth") {
      $("#js-oauth-button").attr("href", selected.data("oauth-url"));
      $("#js-oauth-label").text("Get the key on " + selected.text());
      $("#js-oauth").show();
    } else {
      $("#js-profile").show();
    }
    $("#submit").removeAttr("disabled");

  } else {
    $("#submit").attr("disabled", "disabled");
  }
}

export default function dashboardEntryImport(): void {
  $importer.select2({
    placeholder: "Select a website to import from",
    allowClear: true
  });

  $importer.on("change", () => {
    refreshImporterForm();
    $("#js-entry-references").html("");
  });

  refreshImporterForm();
}
