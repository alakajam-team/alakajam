import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import { CommonLocals } from "server/common.middleware";
import enums from "server/core/enums";
import { digits } from "server/core/templating-filters";
import { ThemeShortlistEliminationState } from "server/entity/event-details.entity";
import { User } from "server/entity/user.entity";
import * as eventMacros from "server/event/event.macros";
import eventThemeShortlistService from "server/event/theme/theme-shortlist.service";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import { eventManageBase } from "../event-manage.base.template";

export default function render(context: CommonLocals): JSX.Element {
  const { event, themes, eliminationThreshold, shortlist, user, eliminationMinNotes, editTheme,
    isShortlistAutoEliminationEnabled, csrfToken } = context;

  context.inlineStyles.push(`
    .table td {
      max-width: 200px;
    }
    `);

  formMacros.registerEditorScripts(context);
  formMacros.registerDatePickerScripts(context);

  return eventManageBase(context, <div>
    <h1>{event.get("title")} themes <span class="count">({themes.length})</span></h1>

    <form method="post" class="js-warn-on-unsaved-changes">
      {csrfToken()}

      <div class="horizontal-bar">
        Theme voting settings
      </div>
      <div class="form-group">
        <label for="theme-page-header">Theme voting page header {formMacros.tooltip("Displayed at the top of the page")}</label>
        {formMacros.editor("theme-page-header", event.related("details").get("theme_page_header"), { minHeight: 50 })}
      </div>
      {shortlistEliminationFields(event, user, isShortlistAutoEliminationEnabled)}

      <div class="form-group">
        <input type="submit" name="shortlist-elimination-form" class="btn btn-primary" value="Save changes" />
      </div>
    </form>

    {ifTrue(["shortlist", "closed", "results"].includes(event.get("status_theme")), () =>
      <div>
        <div class="horizontal-bar">
          Shortlist
        </div>
        {shortlistTable(event, shortlist)}
      </div>
    )}

    <div class="horizontal-bar">
      Submitted themes
    </div>

    <p>Themes are eliminated when they are no longer <span class="badge badge-secondary mr-1">New</span>
      ({eliminationMinNotes} votes or more) and their Elimination Rating gets under&nbsp;
      <strong>{digits(eliminationThreshold * 100, 1)}%</strong>.</p>

    {themesTable(themes, editTheme, eliminationMinNotes, csrfToken)}
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

function shortlistEliminationFields(event: BookshelfModel, user: User, isShortlistAutoEliminationEnabled: boolean) {
  const eventDetails = event.related("details");
  const shotlistElimination: ThemeShortlistEliminationState = eventDetails.get("shortlist_elimination");

  return <div>
    <div class="form-group">
      <label for="start-date">Eliminated shortlist themes</label>
      <div class="form-inline">
        <input class="form-control" name="eliminated-count" value={shotlistElimination.eliminatedCount?.toString() || "0"} />
        <button type="submit" name="eliminate-one" class="btn btn-outline-primary ml-3">Eliminate one!</button>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6">
        <div class="form-group">
          <label for="start-date">Next elimination (<a href="https://www.timeanddate.com/worldclock/timezone/utc" target="_blank">UTC</a>)
            {formMacros.tooltip(`Specify when the next of the shortlisted themes is eliminated. 
              Eliminations will stop when ${eventThemeShortlistService.MIN_REMAINING_THEMES} themes remain.
              If the date is unset or the elimination limit is reached, this feature is disabled.`)}</label>
          {formMacros.dateTimePicker(
            "next-elimination",
            shotlistElimination.nextElimination,
            user,
            { forceUTC: true })}
          <p>
            Automatic elimination state:&nbsp;
            {ifTrue(isShortlistAutoEliminationEnabled, () => <span class="badge badge-success mr-1">Active</span>)}
            {ifFalse(isShortlistAutoEliminationEnabled, () => <span class="badge badge-secondary">Inactive</span>)}
          </p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="form-group">
          <label for="title">Minutes between eliminations</label>
          <input type="text" class="form-control" name="minutes-between-eliminations" value={shotlistElimination.minutesBetweenEliminations} />
        </div>
      </div>
    </div>

  </div>;
}

function themesTable(themes: BookshelfModel[], editTheme: BookshelfModel | undefined,
                     eliminationMinNotes: number, csrfToken: () => JSX.Element) {
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
      {themes
        .filter(theme => ![enums.THEME.STATUS.SHORTLIST, enums.THEME.STATUS.SHORTLIST_OUT].includes(theme.get("status")))
        .map(theme => themesTableRow(theme, editTheme, eliminationMinNotes, csrfToken))}
    </tbody>
  </table>;
}

function themesTableRow(theme: BookshelfModel, editTheme: BookshelfModel | undefined, eliminationMinNotes: number, csrfToken: () => JSX.Element) {
  const isEditedTheme = editTheme && editTheme.get("id") === theme.get("id");
  return <tr>
    <td class="legend">#{theme.get("id")}</td>
    <td>
      <a id={theme.get("id")}></a>
      {ifTrue(isEditedTheme, () =>
        <form method="post" action={"?#" + theme.get("id")} class="form-inline">
          {csrfToken()}
          <input type="hidden" name="id" value={editTheme.get("id")} />
          <input type="text" name="title" class="form-control" value={editTheme.get("title")} autofocus />
          <input type="submit" value="Save" class="btn btn-primary mr-1" />
          <a href={"?#" + theme.get("id")} class="btn btn-outline-primary">Cancel</a>
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
        <div class="badge badge-secondary ml-1" title="New themes cannot be eliminated">New</div>
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
      <a href={`?edit=${theme.get("id")}#${theme.get("id")}`} class="btn btn-sm btn-outline-primary mr-1">
        <span class="fas fa-pencil-alt"></span>
      </a>
      {ifTrue(theme.get("status") !== "banned", () =>
        <a href={`?ban=${theme.get("id")}}#${theme.get("id")}`} class="btn btn-sm btn-outline-primary">Ban</a>
      )}
      {ifTrue(theme.get("status") === "banned", () =>
        <a href={`?unban=${theme.get("id")}}#${theme.get("id")}`} class="btn btn-sm btn-outline-primary">Unban</a>
      )}
    </td>
  </tr>;
}
