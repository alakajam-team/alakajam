const $selectTimezone = $("#js-select-timezone");

interface Timezone {
  id: string;
  offsetName: string;
}

export default function dashboardSettingsTimezone() {
  $selectTimezone.attr("disabled", "true");
  $selectTimezone.select2({
    multiple: true,
    width: "100%",
    placeholder: "Search the capital of your country, or a large city in your timezone"
  });

  $.getJSON("/dashboard/settings/api/timezones").done((data: Timezone[]) => {
    data.map(({ id, offsetName }) => new Option(`${id} (${offsetName}) `, id))
      .forEach((row) => ($selectTimezone as any).append(row));
    $selectTimezone.trigger("change");
    $selectTimezone.removeAttr("disabled");
  });
}
