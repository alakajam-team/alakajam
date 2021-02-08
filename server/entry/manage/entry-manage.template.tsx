import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import security from "server/core/security";
import { markdown } from "server/core/templating-filters";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import { divisionField } from "./components/entry-division-field";
import { highscoreFieldGroup } from "./components/entry-high-score-fieldgroup";
import { linksField } from "./components/entry-links-field";
import { optoutsField } from "./components/entry-optouts-field";
import { teamField } from "./components/entry-team-field";

export default function render(context: CommonLocals): JSX.Element {
  const { entry, event, errorMessages, external, divisionTooltip, members,
    user, allPlatforms, tags, tournamentAdvertising } = context;
  const entryDetails = entry.related("details");
  const picture = entry.picturePreviews().length > 0 ? entry.picturePreviews()[0] : undefined;
  const isEntryOwner = !entry.get("id") || security.canUserManage(user, entry);

  formMacros.registerEditorScripts(context);

  regsiterCustomStyles(context);

  return base(context, <div>
    <div class="container">
      <form id="js-edit-entry-form"
        action={links.routeUrl(entry, "entry", !entry.get("id") ? "create-entry" : "edit")}
        method="post" enctype="multipart/form-data" class="js-warn-on-unsaved-changes">
        {context.csrfToken()}

        <div class="row">
          <div class="col-md-12">
            <h1 id="js-title-display"></h1>

            {errorMessages.map(errorMessage =>
              <div class="alert alert-warning">{errorMessage}</div>
            )}
          </div>
        </div>

        <div class="row entry">
          <div class="col-lg-8 col-md-7">
            <div class="form-group input-group-lg">
              <label for="title">Game title</label>
              <input type="text" class="form-control js-sync-text" name="title" value={entry.get("title")} required
                data-sync-text-display-selector="#js-title-display"
                data-sync-text-default={`My ${external ? "external" : event.get("title")} entry`} autofocus />
            </div>
            <div class="form-group">
              <label for="title">Short description</label>
              <input type="text" class="form-control" name="description" value={entry.get("description")} />
            </div>

            {ifTrue(external, () => {
              formMacros.registerDatePickerScripts(context);

              return <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="title">External event name</label>
                    <select class="form-control js-entry-external-event" name="external-event">
                      {ifTrue(entry.get("external_event"), () =>
                        <option value={entry.get("external_event")}>{entry.get("external_event")}</option>
                      )}
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="title">Entry publication date</label>
                    {formMacros.dateTimePicker("published-at", entry.get("published_at"), user,
                      { serverFormat: "yyyy-MM-dd", pickerFormat: "YYYY-MM-DD" })}
                  </div>
                </div>
              </div>;
            })}

            <div class="form-group">
              <label for="division">Division</label>
              {divisionField(entry, event, external, divisionTooltip, user)}

              {teamField(event, entry, isEntryOwner, members)}
            </div>

            {ifTrue(!external
              && event.related("details").get("category_titles")
              && event.related("details").get("category_titles").includes("Graphics"), () =>
              optoutsField(event, entry, user, isEntryOwner)
            )}

            <div class="horizontal-bar" style="margin-top: 40px">Details</div>


            <div class="form-group">
              <label>Links</label>
              {linksField(entry)}
            </div>

            <div class="form-group">
              <label for="body">Detailed description</label>
              <div class="user-contents user-contents__editor">
                {formMacros.editor("body", entryDetails.get("body"))}
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 col-12">
                <div class="form-group">
                  <label for="platforms">Platforms</label>
                  <select name="platforms" class="form-control js-entry-platforms" multiple>
                    {allPlatforms.map(platform =>
                      <option value={platform} selected={entry.get("platforms")
                        && entry.get("platforms").includes(platform)}>{platform}</option>
                    )}
                  </select>
                </div>
              </div>
              <div class="col-md-6 col-12">
                <div class="form-group">
                  <label for="tags">Tags</label>
                  {formMacros.tooltip("Use this to let people search your game by tech "
                    + "(Unity, Game Maker...), genre (Platformer...), style (Pixel art...), etc.")}
                  <select name="tags" class="form-control js-tags-select" multiple
                    data-allow-new-tags="true"
                    data-find-tags-url={links.routeUrl(null, "tags", "ajax-find-tags")}>
                    {tags.map(tag =>
                      <option value={tag.id} selected>{tag.value}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div class="horizontal-bar" style="margin-top: 40px">High scores</div>

            {ifTrue(tournamentAdvertising, () =>
              <div class="alert alert-info" dangerouslySetInnerHTML={markdown(tournamentAdvertising)} />
            )}

            {highscoreFieldGroup(entry)}

            <div class="horizontal-bar" style="margin-top: 40px">Other</div>

            <div class="form-group">
              <label for="anonymous-enabled">Comments options</label>
              <div>
                {formMacros.check("anonymous-enabled", "Allow anonymous feedback", entry.get("allow_anonymous"), { noMargin: true })}{" "}
                <a href="/article/docs/faq#commenting-anonymously" target="_blank">(learn more)</a>
              </div>
            </div>
          </div>

          <div class="col-lg-4 col-md-5">
            <div class="form-group">
              <label for="title">Picture</label>
              {formMacros.pictureInput("picture", picture,
                { model: entry, legend: "Max size: 2.0 MiB. Ideal ratio: 16:9 (eg. 1280x720). GIFs allowed." })}
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-lg-8 col-md-7">
            <div class="row entry-warnings-container">
              <div class="col-12">
                <div class="js-warnings-no-links entry-warning">
                  Your game has no links! People will be unable to play it.
                </div>
                <div class="js-warnings-no-platforms entry-warning">
                  Your entry has no platforms selected. It will be easier for
                  people to find and play if you choose some platforms!
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-6">
                {ifTrue(entry.has("id"), () =>
                  <span>
                    {ifTrue(isEntryOwner || security.isMod(user), () =>
                      <a class="btn btn-danger" href={links.routeUrl(entry, "entry", "delete")}
                        onclick="return confirm('Delete the entry? All its data will be lost!')">Delete</a>
                    )}
                    {ifFalse(isEntryOwner, () =>
                      <a class="btn btn-danger" href={links.routeUrl(entry, "entry", "leave")}
                        onclick="return confirm('Leave the team? If you want to join again, \
                          the team owner will have to send a new invite!')">Leave the team</a>
                    )}
                  </span>
                )}
              </div>
              <div class="col-6 text-right">
                <input type="submit" class="btn btn-primary mr-1" value="Save changes" />
                <a class="btn btn-outline-primary" href="#" onclick="history.back()">Cancel</a>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
  );
}

function regsiterCustomStyles(context: CommonLocals): void {
  context.inlineStyles.push(`
#edit-team .select2.select2-container {
  width: 200px;
}
#edit-team .select2-selection__choice.owner .select2-selection__choice__remove {
  display: none;
}
#edit-team .select2-search-choice-close {
  left: 6px !important;
  top: 14px;
}
.member .select2-search-choice-close {
  left: 6px !important;
  top: 14px;
}
.member .select2-search-choice {
  padding-bottom: 2px !important;
}
.edit-team-dropdown .select2-result {
  height: 42px;
}

.row.entry-warnings-container {
  background-color: #dc3545;
  color: #fff;
  margin: 10px 0;
  border-radius: 2px;
}
.entry-warning {
  padding: 8px 4px;
  display: none;
}

.member {
  font-size: 16px;
  display: inline-block;
  vertical-align: middle;
  margin: 4px;
  margin-left: 0;
  width: 100%;
}
.member-avatar, .member-info {
  vertical-align: top;
  display: inline-block;
}
.member-avatar .avatar {
  width: 36px;
  border-radius: 6px;
  vertical-align: middle;
  text-align: center;
  margin-right: 8px;
  margin-left: 2px;
}
.member-info .username {
  display: inline-block;
  margin-top: 2px;
}
.member-info .tag {
  display: block;
  font-size: 10px;
  color: #666;
  margin-top: -4px;
}
.member-info .unavailable-tag {
  display: none !important;
}
.select2-results__option[aria-disabled=true] .member-info .unavailable-tag {
  display: block !important;
  margin-top: -5px;
}
.select2-results__option.loading-results[aria-disabled=true] .member-info .unavailable-tag {
  display: none !important;
}

/* Select2 hack to support locking tags from deletion (not supported yet in v4) */
.select2-locked .select2-selection__choice__remove {
  display: none !important;
}
.select2-results__option[aria-selected="true"] {
  display: none;
}

.platform {
  margin-top: 2px;
}

#result-msg.error {
  color: red;
}
`);
}
