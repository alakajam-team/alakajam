import { capitalize, range } from "lodash";
import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifTrue } from "server/macros/jsx-utils";
import { eventManageBase } from "./event-manage.base.template";

export default function render(context: CommonLocals) {
  const { event, entries, divisionQuery, categoryTitles, currentCategoryIndex } = context;

  return eventManageBase(context, <div>
    <h1>{event.get("title")} rankings <span class="count">({entries.length})</span></h1>

    <div class="mb-4">
      <div class="form-group">
        <div class="btn-group" role="group" aria-label="Divisions">
          {Object.keys(event.get("divisions")).map(division => {
            ifTrue(division !== "unranked", () =>
              <a href={`?division=${division}&categoryIndex=${currentCategoryIndex}`}
                class={"btn btn-primary " + (divisionQuery === division ? "active" : "")}>
                {capitalize(division)}
              </a>
            );
          }
          )}
          <a href={`?division=all&categoryIndex=${currentCategoryIndex}`}
            class={"btn btn-primary " + (divisionQuery === "all" ? "active" : "")}>
            All divisions
          </a>
        </div>
      </div>

      <div class="form-group">
        <div class="btn-group" role="group" aria-label="Divisions">
          {range(1, constants.MAX_CATEGORY_COUNT + 1).map(categoryIndex => {
            if (categoryTitles[categoryIndex - 1]) {
              return <a href={`?division=${divisionQuery}&categoryIndex=${categoryIndex}`}
                class={"btn btn-primary " + (categoryIndex === currentCategoryIndex ? "active" : "")}>
                {categoryTitles[categoryIndex - 1]}
              </a>;
            }
          })}
        </div>
      </div>
    </div>

    <h2>
      {title(divisionQuery, categoryTitles, currentCategoryIndex)}
    </h2>

    {formMacros.alerts(context.alerts)}

    {ifTrue(event.related("details").get("flags").scoreSpacePodium && currentCategoryIndex === 7, () =>
      <div>
        <b>Special instructions for ScoreSpace Awards</b>
        <ul>
          <li>Set 1 for Streamer's Choice</li>
          <li>Set 2 for Solo Developer's Choice</li>
          <li>Set 3 for Team Developer's Choice</li>
        </ul>
      </div>
    )}

    <table class="table">
      <tr>
        <th>Entry</th>
        <th>Ranking</th>
      </tr>
      {entries.map(entry =>
        <tr>
          <td>{eventMacros.entrySmallThumb(entry)}</td>
          <td>
            <form method="post" class="form-inline">
              {context.csrfTokenJSX()}
              <input type="hidden" name="entryId" value={entry.get("id")} />
              <input class="form-control form-control-lg mr-3" type="text" name="newRanking"
                value={entry.related("details").get("ranking_" + currentCategoryIndex)} />
              <button type="submit" class="btn btn-danger"
                onclick={`return confirm('Override ranking of "${entry.get("title").replace(/'/g, "\\'")}"?');`}>Save</button>
            </form>
          </td>
        </tr>
      )}
    </table>
  </div>
  );
}

function title(divisionQuery, categoryTitles, currentCategoryIndex) {
  const allDivisions = divisionQuery === "all";
  const divisionName = allDivisions ? "All" : capitalize(divisionQuery);
  return `${divisionName} division${allDivisions ? "s" : ""}, category ${categoryTitles[currentCategoryIndex - 1]}`;
}
