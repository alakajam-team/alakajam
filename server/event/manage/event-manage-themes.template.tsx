import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import { digits } from "server/core/templating-filters";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import { eventManageBase } from "./event-manage.base.template";

export default function render(context: CommonLocals) {
  const { event, themes, eliminationThreshold, shortlist,
    eliminatedShortlistThemes, eliminationMinNotes, editTheme, csrfTokenJSX } = context;

  context.inlineStyles.push(`
    .table td {
      max-width: 200px;
    }
    `);

  formMacros.registerEditorScripts(context);

  return eventManageBase(context, <div>
    <h1>{event.get("title")} themes <span class="count">({themes.length})</span></h1>

    {ifTrue(["shortlist", "closed", "results"].includes(event.get("status_theme")), () =>
      <div>
        <div class="horizontal-bar">
          Shortlist
        </div>
        {shortlistTable(event, shortlist)}
      </div>
    )}

    <div class="horizontal-bar">
      Shortlist elimination
    </div>
    {shortlistEliminationForm(event, eliminatedShortlistThemes, csrfTokenJSX)}

    <div class="horizontal-bar">
      Submitted themes
    </div>

    <p>Themes are eliminated when they are no longer <span class="badge badge-secondary">New</span>
      ({eliminationMinNotes} votes || more) and their Elimination Rating gets under
      <strong>{digits(eliminationThreshold * 100, 1)}%</strong>.</p>

    {themesTable(event, themes, editTheme, eliminationMinNotes, csrfTokenJSX)}
  </div>);
}

function shortlistTable(event, shortlist) {
  return <table class="table sortable">
    <thead>
      <tr>
        <th>Theme</th>
        <th data-sort-default aria-sort="ascending">Score</th>
      </tr>
    </thead>
    <tbody>
      {shortlist.map(theme =>
        <tr>
          <td>
            {ifTrue(event.get("status_theme") === "shortlist", () =>
              <span class="badge badge-secondary">R E D A C T E D</span>
            )}
            {ifTrue(event.get("status_theme") !== "shortlist", () =>
              theme.get("title")
            )}
          </td>
          <td><strong>{theme.get("score")}</strong></td>
        </tr>
      )}
    </tbody>
  </table>;
}

function shortlistEliminationForm(event, eliminatedShortlistThemes, csrfTokenJSX) {
  const eventDetails = event.related("details");

  return <div>
    <p>This optional feature lets you eliminate shortlisted themes one by one in the hours preceding the jam launch.</p>
    <p>
      Current state:
      {ifSet(eventDetails.get("shortlist_elimination").start, () =>
        <span>
          <span class="badge badge-success">Enabled</span>
          <b>(shortlist themes eliminated: {eliminatedShortlistThemes})</b>
        </span>
      )}
      {ifNotSet(eventDetails.get("shortlist_elimination").start, () =>
        <span class="badge badge-secondary">Disabled</span>
      )}
    </p>

    <form method="post" class="js-warn-on-unsaved-changes">
      {csrfTokenJSX()}
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="start-date">Start date (<a href="https://www.timeanddate.com/worldclock/timezone/utc" target="_blank">UTC</a>)
              {formMacros.tooltip("Specify when the first of the shortlisted themes is eliminated. " +
              "Eliminations will stop when 3 themes remain. If the date is unset, feature is disabled.")}</label>
            {formMacros.dateTimePicker(
              "elimination-start-date",
              eventDetails.get("shortlist_elimination").start,
              { forceUTC: true })}
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label for="title">Minutes between eliminations</label>
            <input type="text" class="form-control" name="elimination-delay" value={eventDetails.get("shortlist_elimination").delay} />
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="stream">Twitch channel to display on front page</label>
            <input type="text" class="form-control" name="stream"
              value={eventDetails.get("shortlist_elimination").stream} placeholder="Channel name (e.g. DanaePlays)" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="elimination-body">Banner {formMacros.tooltip("Displayed at the top of the page")}</label>
        {formMacros.editor("elimination-body", eventDetails.get("shortlist_elimination").body)}
      </div>
      <div class="form-group">
        <input type="submit" name="elimination" class="btn btn-primary" value="Save changes" />
      </div>
    </form>
  </div>;
}

function themesTable(event, themes, editTheme, eliminationMinNotes, csrfTokenJSX) {
  return <table class="table sortable">
    <thead>
      <tr>
        <th>#</th>
        <th>Theme</th>
        <th>Status</th>
        <th>Votes</th>
        <th>Positive %</th>
        <th width="70" data-sort-default>Elim. Rat.
          {formMacros.tooltip("High bound of a Wilson interval calculation. Smaller means confidently worse theme.")}</th>
        <th width="70">Shortlist Rat.
          {formMacros.tooltip("Low bound of a Wilson interval calculation. Higher means confidently better theme.")}</th>
        <th data-sort-method="none">Actions</th>
      </tr>
    </thead>
    <tbody>
      {themes.map(theme =>
        ifTrue(theme.get("status") !== "shortlist", () =>
          themesTableRow(theme, editTheme, eliminationMinNotes, csrfTokenJSX)
        )
      )}
    </tbody>
  </table>;
}

function themesTableRow(theme, editTheme, eliminationMinNotes, csrfTokenJSX) {
  const isEditedTheme = editTheme && editTheme.get("id") === theme.get("id");
  return <tr>
    <td class="legend">#{theme.get("id")}</td>
    <td>
      <a name={theme.get("id")}></a>
      {ifTrue(isEditedTheme, () =>
        <form method="post" action="?#{theme.get('id')}" class="form-inline">
          {csrfTokenJSX()}
          <input type="hidden" name="id" value={editTheme.get("id")} />
          <input type="text" name="title" class="form-control" value={editTheme.get("title")} />
          <input type="submit" value="Save" class="btn btn-primary" />
          <a href="?#{theme.get('id')}" class="btn btn-outline-primary">Cancel</a>
        </form>
      )}
      {ifTrue(theme.get("status") !== "banned" && !isEditedTheme, () =>
        theme.get("title")
      )}
      {ifTrue(theme.get("status") === "banned" && !isEditedTheme, () =>
        <span style="text-decoration: line-through">{theme.get("title")}</span>
      )}
    </td>
    <td>
      {eventMacros.eventThemeStatus(theme, { uncensored: true })}
      {ifTrue(theme.get("status") === "active" && theme.get("notes") < eliminationMinNotes, () =>
        <div class="badge badge-secondary" title="New themes cannot be eliminated">New</div>
      )}
    </td>
    <td data-sort={theme.get("notes")}>{(theme.get("score") + theme.get("notes")) / 2} / {theme.get("notes")}</td>
    <td>{digits(50 + (theme.get("normalized_score") || 0) * 50.0, 1)}%</td>
    <td>
      <strong style={["out", "banned"].includes(theme.get("status")) ? "color: grey" : ""}>
        {digits(theme.get("rating_elimination") * 100., 1)}%
      </strong>
    </td>
    <td>
      <strong style={["out", "banned"].includes(theme.get("status")) ? "color: grey" : ""}>
        {digits(theme.get("rating_shortlist") * 100., 1)}%
      </strong>
    </td>
    <td>
      <a href="?edit={theme.get('id') }}#{{ theme.get('id')}" class="btn btn-sm btn-outline-primary">
        <span class="fas fa-pencil-alt"></span>
      </a>
      {ifTrue(theme.get("status") !== "banned", () =>
        <a href="?ban={theme.get('id') }}#{{ theme.get('id')}" class="btn btn-sm btn-outline-primary">Ban</a>
      )}
      {ifTrue(theme.get("status") === "banned", () =>
        <a href="?unban={theme.get('id') }}#{{ theme.get('id')}" class="btn btn-sm btn-outline-primary">Unban</a>
      )}
    </td>
  </tr>;
}
