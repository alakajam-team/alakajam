import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import dashboardBase from "../dashboard.base.template";

export default function render(context: CommonLocals) {
  const { user, featuredEvent, featuredEventEntry, alakajamEntries, otherEntries, externalEntries } = context;

  return dashboardBase(context, <div>
    {ifSet(featuredEvent, () =>
      <div>
        <h1>{featuredEvent.get("title")} entry</h1>
        <div class="container-fluid no-padding">
          <div class="row">
            <div class="col-lg-6">
              {eventMacros.eventShortcutMyEntry(featuredEvent, featuredEventEntry)}
            </div>
          </div>
        </div>
        <div class="spacing"></div>
        <h1>All entries</h1>
      </div>
    )}
    {ifNotSet(featuredEvent, () =>
      <h1>Entries</h1>
    )}

    <div class="form-group">
      <a data-test="import" href={links.routeUrl(user, "user", "entry-import")} class="btn btn-primary mr-1">Import games (Itch.io, etc.)</a>
      <a data-test="create" href="/external-entry/create-entry" class="btn btn-primary">Create external entry manually</a>
    </div>

    {ifTrue(alakajamEntries.length > 0, () =>
      <div>
        <h2>Alakajam! entries ({alakajamEntries.length})</h2>
        {listEntries(alakajamEntries)}
      </div>
    )}

    {ifTrue(otherEntries.length > 0, () =>
      <div>
        <h2>Special events ({otherEntries.length})</h2>
        {listEntries(otherEntries)}
      </div>
    )}

    {ifTrue(externalEntries.length > 0, () =>
      <div>
        <h2>External Entries ({externalEntries.length})</h2>
        {listEntries(externalEntries)}
      </div>
    )}

    {ifTrue(alakajamEntries.length + otherEntries.length + externalEntries.length === 0, () =>
      <div class="card card-body">No entries yet.</div>
    )}
  </div>
  );
}


function listEntries(entries) {
  return <div class="game-grid">
    {entries.map(entry =>
      <div class="game-grid-entry">
        {eventMacros.entryThumb(entry, { showEvent: true })}
        <div class="entry-thumb__form">
          <a href={links.routeUrl(entry, "entry", "edit")} class="btn btn-sm btn-primary"><span class="fas fa-pencil-alt"></span></a>
        </div>
      </div>
    )}
  </div>;
}
