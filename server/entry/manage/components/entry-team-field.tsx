import * as React from "preact";
import links from "server/core/links";
import * as formMacros from "server/macros/form.macros";

export function teamField(event, entry, isEntryOwner, members) {
  return <div id="edit-team" class={"js-edit-entry-team " + (entry.get("division") === "solo" ? "d-none" : "")}
    data-find-team-mate-url={links.routeUrl(event, "event", "ajax-find-team-mate")}
    data-entry-id={entry.get("id") || ""}>
    <div id="result-box" class="form-group" style="display:none;">
      <h3 id="result-msg"></h3>
      <ul id="conflict-list" style="display:none;"></ul>
      <div id="removed-msg" style="display:none;"></div>
      <div id="added-msg" style="display:none;"></div>
    </div>

    <div class="form-group">
      <label for="members">Team members {isEntryOwner ? "" : formMacros.tooltip("You can leave the team at the bottom of this form.")}</label>
      <select name="members" class="bigdrop js-search-members" multiple readOnly={!isEntryOwner}
        title={isEntryOwner ? "" : "Only the entry owner can change this setting. You can leave the team at the bottom of this form."}>
        {members.map(member =>
          <option value={member.id} data-locked={member.locked.toString()} data-invite={member.invite.toString()}
            data-avatar={member.avatar} selected>{member.text}</option>
        )}
      </select>
    </div>
  </div>;
}
