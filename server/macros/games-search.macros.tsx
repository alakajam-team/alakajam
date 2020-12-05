import { capitalize } from "lodash";
import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { ifFalse, ifSet, ifTrue } from "./jsx-utils";

export function searchForm(context: Record<string, any>, options: { fixedEvent?: boolean } = {}): JSX.Element {
  const divisions = context.event ? Object.keys(context.event.get("divisions")) : ["solo", "team", "unranked"];

  return <div class="list-group">
    <div class="list-group-item">
      <h4 style="margin: 0">Search filters</h4>
    </div>
    <form method="get" class="list-group-item">
      {ifFalse(options.fixedEvent, () =>
        <div class="form-group">
          <label for="search">Event</label>
          <select name="eventId" class="form-control js-select" data-placeholder="All events" data-allow-clear="true">
            <option value="" selected={!context.searchOptions.eventId}></option>
            {context.events.map(event =>
              <option value={event.get("id")} selected={event.get("id") === context.searchOptions.eventId}>{event.get("title")}</option>
            )}
            <option value="none" selected={context.searchOptions.eventId === null}>(External events)</option>
          </select>
        </div>
      )}
      <div class="form-group">
        <label for="search">Title search</label>
        <input name="search" type="text" class="form-control" value={context.searchOptions.search} />
      </div>
      <div class="form-group">
        <label for="user">User</label>
        <select name="user" class="form-control js-user-select">
          {ifTrue(context.searchOptions.user, () =>
            <option value={context.searchOptions.user.get("id")} selected>{context.searchOptions.user.get("title")}</option>
          )}
        </select>
      </div>
      <div class="form-group">
        <label for="platforms">Platforms</label>
        <select name="platforms" class="form-control js-select" multiple size={2}>
          {context.platforms?.map(platform =>
            <option value={platform.id} selected={context.searchOptions.platforms
              && context.searchOptions.platforms.includes(platform.id)}>{platform.name}</option>
          )}
        </select>
      </div>
      <div class="form-group">
        <label for="platforms">Tags</label>
        <select name="tags" class="form-control js-tags-select" multiple
          data-find-tags-url={links.routeUrl(null, "tags", "ajax-find-tags")}>
          {context.searchOptions.tags?.map(tagInfo =>
            <option value={tagInfo.id} selected>{tagInfo.value}</option>
          )}
        </select>
      </div>
      <div class="form-group">
        <label for="divisions">Divisions</label>
        <select name="divisions" class="form-control js-select" multiple>
          {divisions?.map(division => {
            const active = !context.searchOptions.divisions || context.searchOptions.divisions.includes(division);
            return <option value={division} selected={active}>{capitalize(division)}</option>;
          })}
        </select>
      </div>
      <div class="form-group">
        {ifSet(context.user, () =>
          <div>
            <label>
              <input type="checkbox" name="hideReviewed" checked={context.searchOptions.notReviewedById} class="mr-1" />
              Hide rated or commented by me
            </label>
          </div>
        )}
        <div>
          <label><input type="checkbox" name="highScoresSupport" checked={context.searchOptions.highScoresSupport} class="mr-1" />
          High scores support
          </label>
        </div>
        {ifTrue(security.isMod(context.user), () =>
          <>
            <hr />
            <b>Moderator filters</b>
            <div>
              <label><input type="checkbox" name="allowsTournamentUse" checked={context.searchOptions.allowsTournamentUse} class="mr-1" />
              Allows tournament use
              </label>
            </div>
          </>
        )}
      </div>
      <div class="form-group">
        <input type="submit" class="btn btn-primary mr-1" value="Apply" />
        <a href="?" class="btn btn-outline-primary">Clear</a>
      </div>
    </form>
  </div>;
}

export function searchDescription(searchOptions: any, searchedEvent) {
  if (searchOptions.search || searchOptions.user || searchOptions.tags
    || searchOptions.divisions || searchOptions.highScoresSupport
    || searchOptions.allowsTournamentUse || searchOptions.platforms?.length > 0) {
    return <div class="count" style="font-size: 1rem">{/* TODO rename CSS class to "legend" */}
      {searchOptions.user ? ("made by " + searchOptions.user.get("title") + " ") : ""}
      {ifTrue(searchOptions.tags && searchOptions.tags?.length > 0, () =>
        <>
          with tag{searchOptions.tags?.length > 1 ? "s " : " "}
          {searchOptions.tags?.map((tag, index) =>
            tag.value + (index < searchOptions.tags?.length - 1 ? " || " : "")
          )}
        </>
      )}
      {searchOptions.platforms?.length > 0 ? " on restricted platforms" : ""}
      {searchOptions.divisions ? " in division" + (searchOptions.divisions?.length > 1 ? "s" : "")
        + " '" + (searchOptions.divisions.join(", ").replace(", unranked", "")) + "'" : ""}
      {searchOptions.highScoresSupport ? " with high scores support" : ""}
      {searchOptions.allowsTournamentUse ? " allowing tournament use" : ""}
      {searchOptions.search ? ' matching "' + searchOptions.search + '"' : ""}
    </div>;
  }
}
