import { BookshelfModel } from "bookshelf";
import { capitalize } from "lodash";
import React, { JSX } from "preact";
import constants from "server/core/constants";
import forms from "server/core/forms";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";

export function divisionField(entry: BookshelfModel, event: BookshelfModel, external: boolean, divisionTooltip: string, user: User): JSX.Element {
  const isEntryOwner = !entry.get("id") || security.canUserManage(user, entry);
  const canEditDivision = !event || isEntryOwner && event.get("status_entry") === "open";
  const isMod = security.isMod(user);

  return <div class="entry__divisions toggle js-entry-divisions" data-toggle="buttons"
    data-initial-division={entry.get("division")}>
    {ifFalse(external, () =>
      Object.entries(event.get("divisions")).map(([name, description]: [string, string]) =>
        divisionButton(capitalize(name), description, constants.DIVISION_ICONS[name], name,
          entry.get("division"), canEditDivision, divisionTooltip, isMod)
      )
    )}
    {ifTrue(external, () =>
      <div>
        {divisionButton("Solo", "", constants.DIVISION_ICONS.solo, "solo",
          entry.get("division"), canEditDivision, divisionTooltip, isMod)}
        {divisionButton("Team", "", constants.DIVISION_ICONS.team, "team",
          entry.get("division"), canEditDivision, divisionTooltip, isMod)}
      </div>
    )}
    {ifFalse(external, () =>
      <p>
        <small class="form-text text-muted">
          {ifTrue(event.get("status_entry") === "open", () => {
            const rulesLink = forms.isId(event.get("status_rules")) ? links.routeUrl(event.get("status_rules"), "post") : event.get("status_rules");
            return <div>
              Check the <a href={rulesLink !== "off" ? rulesLink : "/article/docs"}>Docs section</a> for detailed rules on each division.
            {isEntryOwner ? "" : "Only the entry owner can change this setting."}
            </div>;
          })}
          {ifTrue(event.get("status_entry") !== "open", () =>
            <div>Divisions can no longer be changed.</div>
          )}
        </small>
        {ifTrue(!canEditDivision && isMod, () =>
          <div class="badge badge-secondary">Division can still be changed due to mod privileges</div>
        )}
      </p>
    )}
  </div>;
}

function divisionButton(title: string, legend: string, icon: string, value: string, currentValue: string,
  canEditDivision: boolean, tooltipMessage: string, isMod: boolean): JSX.Element {
  if (canEditDivision || isMod) {
    return <label class={`btn entry-division js-division-button ${value === currentValue ? "active" : ""}`} role="button">
      <div class={icon}></div>
      <input type="radio" name="division" value={value} autocomplete="off" class="d-none" checked={value === currentValue} />
      {title}
      <div class="entry-division__legend d-none d-sm-block d-none d-md-block" dangerouslySetInnerHTML={({ __html: legend })}></div>
    </label>;
  } else {
    return <div class={"btn entry-division " + (value === currentValue ? "active" : "disabled")} title={tooltipMessage}>
      <div class={icon}></div>
      {title}
      <div class="entry-division__legend d-none d-sm-block d-none d-md-block" dangerouslySetInnerHTML={({ __html: legend })}></div>
    </div>;
  }
}
