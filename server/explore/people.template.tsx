import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";
import * as tabsMacros from "server/macros/tabs.macros";
import * as userMacros from "server/user/user.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { events, searchOptions, path, userCount, searchedEvent, users, currentPage, pageCount } = context;

  context.pageTitle = "User search";

  return base(context,
    <div class="container">

      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a href="/events">Events</a></li>
          <li class="breadcrumb-item active" aria-current="page">User search</li>
        </ol>
      </nav>

      {tabsMacros.peopleTabs(path)}

      <div class="row spacing">
        <div class="col-sm-4 col-md-3">
          {searchForm(searchOptions, events)}
        </div>
        <div class="col-sm-8 col-md-9">
          <h1>Users <span class="count">({userCount})</span></h1>

          {ifTrue(searchOptions.search || searchOptions.eventId !== undefined || searchOptions.withEntries, () =>
            <div class="count" style="font-size: 1rem; margin-top: -15px; margin-bottom: 20px">{/* TODO rename CSS class to "legend" */}
              {searchOptions.search ? ' matching "' + searchOptions.search + '"' : ""}
              {ifSet(searchedEvent, () =>
                <>&nbsp;who joined <a href={links.routeUrl(searchedEvent, "event")}>{searchedEvent.get("title")}</a></>
              )}
              {searchOptions.withEntries ? " submitting an entry" : ""}
            </div>
          )}

          {navigationMacros.pagination(currentPage, pageCount, path)}

          <div class="row user-thumbs">
            {users.map(userMacros.userThumb)}
          </div>
        </div>
      </div>
    </div>
  );
}

function searchForm(searchOptions, events) {
  return <div class="list-group">
    <div class="list-group-item">
      <h4 style="margin: 0">Search filters</h4>
    </div>
    <form method="get" class="list-group-item">
      <div class="form-group">
        <label for="search">Name search</label>
        <input type="text" name="search" value={searchOptions.search} class="form-control" />
      </div>
      <div class="form-group">
        <label for="search">Joined event</label>
        <select name="eventId" class="form-control js-select" data-placeholder="None" data-allow-clear="true">
          <option value=""></option>
          {events.map(event =>
            <option selected={event.get("id") === searchOptions.eventId} value={event.get("id")}>{event.get("title")}</option>
          )}
        </select>
      </div>
      <div>
        <label>
          <input type="checkbox" name="withEntries" checked={searchOptions.withEntries} class="mr-1" />
          With entries
        </label>
      </div>
      <div class="form-group">
        <input type="submit" class="btn btn-primary mr-1" value="Apply" />
        <a href="?" class="btn btn-outline-primary">Clear</a>
      </div>
    </form>
  </div>;
}
