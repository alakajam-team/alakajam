import * as React from "preact";
import base from "server/base.template";
import { ifTrue, ifSet, ifNotSet } from "server/macros/jsx-utils";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as formMacros from "server/macros/form.macros";
import { capitalize } from "lodash";
import constants from "server/core/constants";
import security from "server/core/security";
import * as templatingFilters from "server/core/templating-filters";

export default function render(context: CommonLocals) {
  const { post, user, errorMessage, featuredEvent, specialPostType, allEvents, relatedEvent } = context;

  formMacros.registerEditorScripts(context);

  return base(context,
    <div class="container thin">
      <h1 id="title-display"></h1>

      <form method="post" class="js-warn-on-unsaved-changes">
        {context.csrfToken()}

        {ifTrue(errorMessage, () =>
          <div class="alert alert-warning">{errorMessage}</div>
        )}

        {ifTrue(featuredEvent && ["voting", "voting_rescue"].includes(featuredEvent.get("status_results")), () =>
          <div class="alert alert-warning">
            <p class="alert-title"><i class="fas fa-exclamation-triangle"></i> During the voting phase...</p>
            <p>Please do not make advertising posts that purely ask for votes.
              The preferred way to get votes is to <a href="/article/docs/faq/">increase your karma</a>.
              Post-mortems, technical articles and other interesting contents about your jam participation are welcome!
            </p>
          </div>
        )}

        <div class="form-group input-group-lg">
          <label for="title">Title</label>
          <input type="text" class="form-control js-sync-text" name="title" value={post.get("title")} required
            data-sync-text-display-selector="#title-display"
            data-sync-text-default={specialPostType ? capitalize(specialPostType) : "Blog post"} />
        </div>

        <div class="form-group">
          {ifTrue(security.isMod(user), () =>
            <select name="special-post-type" class="js-select form-control"
              data-placeholder="Special post type" data-allow-clear="true">
              <option value=""></option>
              {constants.SPECIAL_POST_TYPES.map(type =>
                <option value={type} selected={type === specialPostType}>{capitalize(type)}</option>
              )}
            </select>
          )}
          {ifTrue(specialPostType && !security.isMod(user), () =>
            <div class="post__special-type">
              <span class="post__special-type-label">
                <span class="d-none d-sm-block visible-sm visible-md visible-lg">
                  {specialPostType.toUpperCase()}
                </span>
                <span class="visible-xs d-none d-md-block">
                  <span class="fas fa-thumbtack"></span>
                </span>
              </span>
            </div>
          )}
        </div>

        <div class="form-group">
          <label>Related event</label>
          <div class="form-inline">
            {formMacros.select("event-id", allEvents, relatedEvent ? relatedEvent.get("id") : undefined, { nullable: true })}
          </div>
        </div>

        <div class="form-group">
          <label for="body">Body</label>
          {formMacros.editor("body", post.get("body"))}
        </div>

        <div class="d-flex">
          <div>
            {ifTrue(post.has("id"), () =>
              <a class="btn btn-danger" onclick="return confirm('Delete the post? All its data will be lost!')"
                href={links.routeUrl(post, "post", "delete")}>Delete</a>
            )}
          </div>
          <div class="ml-auto post__actions text-right">
            {ifSet(post.get("published_at"), () =>
              <jsx-wrapper>
                <input type="submit" class="btn btn-primary mr-1" name="save" value="Save changes" />
                <input type="submit" class="btn btn-outline-secondary mr-1" name="unpublish" value="Unpublish" />
              </jsx-wrapper>
            )}
            {ifNotSet(post.get("published_at"), () =>
              <jsx-wrapper>
                <input type="submit" class="btn btn-primary mr-1" name="publish" value="Save and publish now" />
                <input type="submit" class="btn btn-outline-secondary mr-1" name="save-draft" value="Save draft" />
              </jsx-wrapper>
            )}
            <input type="button" class="btn btn-outline-secondary mr-1 js-show js-hide" name="save"
              value="Schedule..." data-show-selector=".post__schedule" data-hide-selector=".post__actions" />
            <a class="btn btn-outline-secondary" href="#" onclick="history.back()">Cancel</a>
          </div>
          <div class="ml-auto post__schedule text-right form-inline d-none">
            <div class="form-group">
              <label for="published-at" class="mr-1">
                Publication date
            (in {templatingFilters.timezone(user.get("timezone")) || "UTC"}
                {ifNotSet(user.get("timezone"), () =>
                  <a href={links.routeUrl(user, "user", "settings")} class="btn btn-outline-secondary btn-sm">
                    <span class="fa fa-cog"></span>
                  </a>
                )}
            )
              </label>
              {formMacros.dateTimePicker("published-at", post.get("published_at"), user)}
            </div>
            <div class="form-group">
              <input type="submit" class="btn btn-primary mx-1" name="save-custom" value="Schedule" />
              <input type="button" class="btn btn-outline-secondary js-show js-hide" value="Back..."
                data-show-selector=".post__actions" data-hide-selector=".post__schedule" />
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
