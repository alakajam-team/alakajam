import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as eventMacros from "server/event/event.macros";
import { ifFalse, ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import dashboardBase from "./dashboard.base.template";

export default function render(context: CommonLocals) {
  const { user, importer, availableImporters, profileIdentifier, oauthIdentifier, entryReferences } = context;

  context.inlineStyles.push(`
  #js-importer .select2-results__option {
    font-size: 30px;
  }
  `);

  return dashboardBase(context, <div>
    <h1>External entry importer</h1>

    <p>This tool helps you import entries from other websites. If you don't find the site you're looking for, you can still use the manual form.</p>
    <a href="/external-entry/create-entry" class="btn btn-outline-primary">Create entry manually</a>
    <a href={links.routeUrl(user, "user", "entries")} class="btn btn-outline-primary">Back to Entries</a>

    <form method="post">
      {context.csrfTokenJSX()}
      <h2 class="spacing">Importer configuration</h2>
      <div class="container-fluid no-padding">
        <div class="row">
          <div class="col-md-9">
            <div class="card card-body">
              <div class="form-group">
                <label for="title">Importer</label>
                <select class="form-control js-importer" id="js-importer" name="importer" required>
                  <option selected={!importer}></option>
                  {availableImporters.map(availableImporter =>
                    <option value={availableImporter.config.id}
                      data-mode={availableImporter.config.mode}
                      data-oauth-url={availableImporter.config.oauthUrl}
                      selected={importer === availableImporter.config.id}>
                      {availableImporter.config.title}
                    </option>
                  )}
                </select>
              </div>
              <div class="form-group" id="js-profile" style="display: none">
                <label for="title">User name || profile URL</label>
                <input class="form-control" id="profileIdentifier" name="profileIdentifier" type="text" value={profileIdentifier} />
              </div>
              <div class="form-group" id="js-oauth" style="display: none">
                <label for="title">OAuth key</label>
                <ol style="padding-left: 20px; font-size: 1.1rem; line-height: 3rem">
                  <li>
                    <a id="js-oauth-button" href="?" class="btn btn-primary" target="_blank">
                      <span class="fas fa-external-link"></span> <span id="js-oauth-label"></span>
                    </a>
                  </li>
                  <li>
                    <input class="form-control" id="oauthIdentifier" name="oauthIdentifier" type="text"
                      value={oauthIdentifier} placeholder="Paste the key here" />
                  </li>
                </ol>
                <p>Note: The authentication key will !be saved. It will only be used for importing games, then forgotten.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {entriesToImport(entryReferences)}

      <div class="form-group">
        <input id="submit" type="submit" value={entryReferences ? "Confirm" : "Search games"} class="btn btn-primary" />
      </div>
    </form>
  </div>);
}

function entriesToImport(entryReferences) {
  return <div id="js-entry-references">
    {ifTrue(entryReferences, () =>
      <div>
        <h2 class="spacing">Found entries <span class="legend">({entryReferences ? entryReferences.length : "0"})</span></h2>
        <div class="container-fluid no-padding">
          <div class="row">
            <div class="col-md-9">
              <div class="form-group">

                {ifTrue(entryReferences.error, () =>
                  <div>
                    <p class="alert alert-danger"><b>Error:</b> {entryReferences.error}.</p>
                    <p>If you are sure the target website is online, there might be a bug, see
                      <a href="/article/about">the docs for ways to contact an admin</a>.</p>
                  </div>
                )}
                {ifTrue(!entryReferences.error && entryReferences.length > 0, () =>
                  <div>

                    <p>Please check the games you want to import.</p>
                    <p>
                      <input type="button" class="btn btn-outline-primary btn-sm js-check-all" value="Check all"
                        data-check-all-selector=".js-import-checkbox" />
                      <input type="button" class="btn btn-outline-primary btn-sm js-check-none" value="Uncheck all"
                        data-check-none-selector=".js-import-checkbox" />
                    </p>
                    <table class="table">
                      <thead>
                        <th>
                          Import?
                        </th>
                        <th></th>
                        <th>Title</th>
                        <th>Already imported</th>
                      </thead>
                      <tbody>
                        {entryReferences.map(entryReference =>
                          <tr>
                            <td>
                              <input type="checkbox" name="entries" value={entryReference.id} class="js-checkbox js-import-checkbox" />
                            </td>
                            <td>
                              {ifTrue(entryReference.thumbnail, () =>
                                <img src={entryReference.thumbnail} style="max-width: 200px; max-height: 150px" />
                              )}
                            </td>
                            <td>
                              <h3>
                                {ifTrue(entryReference.link, () =>
                                  <a target="_blank" href={entryReference.link}>
                                    {entryReference.title}<span class="legend fas fa-external-link"></span>
                                  </a>
                                )}
                                {ifFalse(entryReference.link, () =>
                                  entryReference.title
                                )}
                              </h3>
                            </td>
                            <td>
                              {ifSet(entryReference.existingEntry, () =>
                                <div>
                                  <p><span class="badge badge-warning">Yes, entry will be updated</span></p>
                                  {eventMacros.entrySmallThumb(entryReference.existingEntry)}
                                </div>
                              )}
                              {ifNotSet(entryReference.existingEntry, () =>
                                <span class="badge badge-secondary">No</span>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div class="form-group card card-body">
                      <label>
                        <input type="checkbox" name="run" class="form-control js-checkbox" required />
                      &nbsp;I confirm those games are mine. If I change my mind, I will have to delete them one by one. Let's import them!
                      </label>
                    </div>
                  </div>
                )}
                {ifTrue(!entryReferences.error && entryReferences.length === 0, () =>
                  <p>No entries were found for this user name.</p>
                )}
              </div>
            </div>
          </div>
        </div >
      </div >
    )
    }
  </div >;
}
