import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { eventRulesLink } from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifTrue } from "server/macros/jsx-utils";

export function optoutsField(event: BookshelfModel, entry: BookshelfModel, user: User, isEntryOwner: boolean): JSX.Element {
  const canEditOptouts = isEntryOwner || security.isMod(user);
  const optouts = entry.related("details").get("optouts");
  const rulesLink = eventRulesLink(event);

  return <div>
    <div id="edit-optouts" class={entry.get("division") === "unranked" ? "d-none" : ""}>
      <div class="form-group" title={!canEditOptouts ? "Only the entry owner can change this setting" : ""}>
        <label>Opt-outs (<a href="/article/docs/faq#opt-outs" target="_blank">help</a>)</label>
        <div class="form-inline">
          <label>
            <input type="checkbox" name="optout-graphics" class="js-checkbox"
              readonly={!canEditOptouts}
              checked={optouts && optouts.includes("Graphics")}
              disabled={!canEditOptouts} />
            <span class="ml-1 mr-3">Disable ratings for graphics</span>
          </label>
          <label>
            <input type="checkbox" name="optout-audio" class="js-checkbox"
              readonly={!canEditOptouts}
              checked={optouts && optouts.includes("Audio")}
              disabled={!canEditOptouts} />
            <span class="ml-1 mr-3">Disable ratings for audio</span>
          </label>
        </div>
      </div>
    </div>

    {ifTrue(event && event.get("status_entry") === "open" && event.get("status_rules") !== "off", () =>
      <div id="accept-rules" class="alert alert-warning d-flex">
        <img src={links.staticUrl("/static/images/docs/play.png")} class="mr-3 mt-3" height="49" />
        <div>
          <p class="mb-2"><b>Submitting a ranked game</b></p>
          <label class="mb-2 d-flex" for="accepted-rules">
            <span>{formMacros.check("accepted-rules", "", Boolean(entry.get("id") && entry.get("division") !== "unranked"),
              { required: true })}</span>
            <span>I confirm that the entry <a href={rulesLink}>follows the rules on asset reuse</a>,
                            even if I opted-out of graphics/audio ratings.<br />
                            See <a href={rulesLink + "#allowed"}>"What is allowed?"</a> for more info.
            </span>
          </label>
        </div>
      </div>
    )
    }
  </div>;
}
