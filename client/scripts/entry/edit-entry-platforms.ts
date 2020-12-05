
export default function editEntryPlatforms(): void {
  $(".js-entry-platforms").each(function() {
    const $entryPlatforms = $(this);

    function format(platform) {
      return '<div class="platform">' + platform.text + "</div>";
    }

    $entryPlatforms.select2({
      multiple: true,
      placeholder: "Select platforms",
      width: "100%",
      formatResult: format,
      formatSelection: format
    });
  });
}
