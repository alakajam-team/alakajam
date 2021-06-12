import React, { JSX } from "preact";
import { TimezoneOption } from "../user-timezone.service";

export function timezoneField(timezones: TimezoneOption[], selectedTimezone: string): JSX.Element {
  return <div class="form-group">
    <label for="timezone">Timezone</label>
    <p class="legend">Useful for viewing jam times in your local zone</p>
    <select name="timezone" class="form-control js-select" data-allow-clear="true" data-placeholder="Type a city or country name">
      <option value=""></option>
      {timezones.map(timezone =>
        <option value={timezone.id} selected={selectedTimezone === timezone.id}>{timezone.label}</option>
      )}
    </select>
  </div>;
}
