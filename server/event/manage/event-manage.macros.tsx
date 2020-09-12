import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import forms from "server/core/forms";
import { dump } from "server/core/templating-filters";
import { User } from "server/entity/user.entity";
import * as formMacros from "server/macros/form.macros";
import { ifNotSet, ifSet } from "server/macros/jsx-utils";

/*
 * Various chunks of the event edition form have been extracted here
 * for reuse on the event templates/event presets admin forms.
*/

export interface EventCountdownOffset {
  d: number;
  h: number;
  m: number;
}

export function linksForm(eventDetails: BookshelfModel) {
  return <div class="form-group">
    <label for="links">Home page shortcuts
      {formMacros.tooltip("Must be a valid JSON array of links, "
      + 'eg. [{ "title": "Event rules", "link": "/post/123", "icon": "fa-question-circle" }]')}</label>
    <textarea name="links" class="codemirror auto-height">{JSON.stringify(eventDetails?.get("links") || [], null, 2)}</textarea>
  </div>;
}

export function countdownForm(event: BookshelfModel, user: User, options: { countdownOffset?: EventCountdownOffset } = {}) {
  return <>
    <div class="horizontal-bar">
      Home page
    </div>

    <div class="form-group">
      <b>Call to action</b>
      <div class="form-inline">
        <div class="form-group mr-3">
          <label class="mr-1" for="countdown-message">Message</label>
          <input type="text" class="form-control" style="min-width: 250px"
            name="countdown-message" value={event?.get("countdown_config")?.message} />
        </div>
        <div class="form-group">
          <label for="countdown-link">Link page&nbsp;
            {formMacros.tooltip('Among "themes", "posts", "games", "results", or an absolute path like "/post/create"')}</label>
          <input type="text" class="form-control" name="countdown-link" value={event?.get("countdown_config")?.link} />
        </div>
      </div>
    </div>

    <div class="form-group">
      <b>Next deadline</b>
      <div class="form-inline">
        <div class="form-group mr-3">
          <label>Phrase&nbsp;
            {formMacros.tooltip('For instance: "ends", "voting starts"... '
              + 'or directly "starts January 31st" if the date is not set.')}</label>
          <input type="text" class="form-control" name="countdown-phrase" value={event?.get("countdown_config")?.phrase} />
        </div>
        <div class="form-group mr-3">
          {ifSet(options.countdownOffset, () =>
            <>
              <label class="mr-1">Offset from start</label>
              <input type="text" name="countdown-offset-d" class="form-control"
                style="width: 50px" value={options.countdownOffset.d || "0" } />d
              <input type="text" name="countdown-offset-h" class="form-control"
                style="width: 50px" value={options.countdownOffset.h || "0" } />h
              <input type="text" name="countdown-offset-m" class="form-control"
                style="width: 50px" value={options.countdownOffset.m || "0" } />m
              &nbsp;
            </>
          )}
          {ifNotSet(options.countdownOffset, () =>
            <>
              <label class="mr-1">Date
                (<a href="https://www.timeanddate.com/worldclock/timezone/utc" target="_blank">UTC</a>)</label>
              {formMacros.dateTimePicker("countdown-date", event?.get("countdown_config")?.date, user, { forceUTC: true })}
            </>
          )}
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" class="form-control js-checkbox" name="countdown-enabled"
              checked={event?.get("countdown_config")?.enabled} />&nbsp;
              Animated countdown
          </label>
        </div>
      </div>
    </div>
  </>;
}

export function stateForm(event: BookshelfModel) {
  const flags = event?.related("details").get("flags") || {};

  return <>
    <div class="horizontal-bar">Global</div>

    <div class="form-group">
      <label for="status"><b>Global status</b></label>
      <div class="form-inline">
        {formMacros.radio("status", "pending", "Pending",
          event?.get("status") || "pending")}
        {formMacros.radio("status", "open", "Open",
          event?.get("status"))}
        {formMacros.radio("status", "closed", "Closed",
          event?.get("status"))}
      </div>
    </div>

    <div id="js-edit-event-status-jam">
      <div class="horizontal-bar">Game jam</div>
      <div class="form-group">
        <label for="status-theme"><b>Theme voting status</b></label>
        <div class="form-inline">
          {formMacros.radio("status-theme", "disabled", "Disabled",
            event?.get("status_theme") || "disabled")}
          {formMacros.radio("status-theme", "off", "Off",
            event?.get("status_theme"))}
          {formMacros.radio("status-theme", "voting", "Voting",
            event?.get("status_theme"))}
          {formMacros.radio("status-theme", "shortlist", "Shortlist",
            event?.get("status_theme"))}
          {formMacros.radio("status-theme", "closed", "Closed",
            event?.get("status_theme"))}
          {formMacros.radio("status-theme", "results", "Results",
            event?.get("status_theme"))}
          {formMacros.radio("status-theme", "", "",
            event?.get("status_theme"), { textField: true, placeholder: "Post ID", textFieldEnabled: forms.isId(event?.get("status_theme")) })}
        </div>
      </div>
      <div class="form-group">
        <label for="status-entry"><b>Entry submission status</b></label>
        <div class="form-inline">
          {formMacros.radio("status-entry", "disabled", "Disabled",
            event?.get("status_entry"))}
          {formMacros.radio("status-entry", "off", "Off",
            event?.get("status_entry") || "off")}
          {formMacros.radio("status-entry", "open", "Open",
            event?.get("status_entry"))}
          {formMacros.radio("status-entry", "open_unranked", "Open (unranked only)",
            event?.get("status_entry"))}
          {formMacros.radio("status-entry", "closed", "Closed",
            event?.get("status_entry"))}
        </div>
      </div>
      <div class="form-group">
        <label for="status-results"><b>Event results status</b></label>
        <div class="form-inline">
          {formMacros.radio("status-results", "disabled", "Disabled",
            event?.get("status_results") || "disabled")}
          {formMacros.radio("status-results", "off", "Off",
            event?.get("status_results"))}
          {formMacros.radio("status-results", "voting", "Voting",
            event?.get("status_results"))}
          {formMacros.radio("status-results", "voting_rescue", "Voting (rescue)",
            event?.get("status_results"))}
          {formMacros.radio("status-results", "closed", "Closed",
            event?.get("status_results"))}
          {formMacros.radio("status-results", "results", "Results",
            event?.get("status_results"))}
          {formMacros.radio("status-results", "", "",
            event?.get("status_results"), { textField: true, placeholder: "Post ID", textFieldEnabled: forms.isId(event?.get("status_results")) })}
        </div>
      </div>
    </div>

    <div>
      <div class="horizontal-bar">Tournament</div>
      <div class="form-group">
        <label for="status-theme"><b>Tournament status</b></label>
        <div class="form-inline">
          {formMacros.radio("status-tournament", "disabled", "Disabled",
            event?.get("status_tournament") || "disabled")}
          {formMacros.radio("status-tournament", "off", "Off",
            event?.get("status_tournament"))}
          {formMacros.radio("status-tournament", "submission", "Submission",
            event?.get("status_tournament"))}
          {formMacros.radio("status-tournament", "playing", "Playing",
            event?.get("status_tournament"))}
          {formMacros.radio("status-tournament", "closed", "Closed",
            event?.get("status_tournament"))}
          {formMacros.radio("status-tournament", "results", "Tournament results",
            event?.get("status_tournament"))}
        </div>
      </div>
    </div>

    <div>
      <div class="horizontal-bar">Streamers</div>
      <div class="form-group">
        {formMacros.check("streamerOnlyTournament", "Streamer-only tournament", flags?.streamerOnlyTournament)}
        {formMacros.check("scoreSpacePodium", "ScoreSpace podium", flags?.scoreSpacePodium)}
        <span style="margin-left: -10px" class="mr-1">
          {formMacros.tooltip("The 1st, 2nd, and 3rd placed entries in the 7th rating category will be displayed "
            + 'respectively for the Streamer choice, Solo choice and Team choice. Use the "Rankings" tab to set them.')}
        </span>
        {formMacros.check("hideStreamerMenu", "Hide Streamer Menu", flags?.hideStreamerMenu)}
      </div>
    </div>
  </>;
}

export function jamConfigForm(event: BookshelfModel, eventDetails: BookshelfModel) {
  return <>
    <div class="form-group">
      <label for="divisions">Divisions {formMacros.tooltip("Must be a valid JSON object, "
        + "with keys being the name (among: solo,team,ranked,unranked) and values the description.")}</label>
      <textarea name="divisions" class="codemirror auto-height">{dump(event?.get("divisions") || [])}</textarea>
    </div>
    <div class="form-group">
      <label for="category-titles">Rating categories {formMacros.tooltip('Must be a valid JSON array of strings, eg. ["General","Theme"]')}</label>
      <textarea name="category-titles" class="codemirror auto-height">{JSON.stringify(eventDetails?.get("category_titles") || [])}</textarea>
    </div>
  </>;
}
