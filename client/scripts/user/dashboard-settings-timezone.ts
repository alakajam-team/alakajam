const $selectTimezone = $("#js-select-timezone");

export default function dashboardSettingsTimezone() {
  $selectTimezone.select2({
    width: "100%",
    placeholder: "Search a country or city"
  });
}
