
export default function editEntryPlatforms(): void {
  function format(platform) {
    return '<div class="platform">' + platform.text + "</div>";
  }

  $(".js-entry-platforms").each(function() {
    const $entryPlatforms = $(this);

    function updateWarning() {
      $('.js-warnings-no-platforms').toggle(
        $entryPlatforms.select2('data').length === 0
      );
    }

    $entryPlatforms.select2({
      multiple: true,
      placeholder: "Select platforms",
      width: "100%",
      formatResult: format,
      formatSelection: format
    }).on('change', updateWarning);

    updateWarning();
  });
}
