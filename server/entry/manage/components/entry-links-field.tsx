import { BookshelfModel } from "bookshelf";
import { range } from "lodash";
import React, { JSX } from "preact";

export function linksField(entry: BookshelfModel): JSX.Element {
  const links = entry.get("links") || [];
  const linkCount = Math.max(links.length, 3);

  return <div>
    <div class="js-links card card-body" data-entry-links={JSON.stringify(links)}>
      {/* No-JavaScript link support */}
      <input type="hidden" name="submit-links" value="true" />

      {range(0, linkCount).map(linkIndex => {
        const link = links.length > linkIndex ? links[linkIndex] : {};
        return <div class="row mb-1">
          <div class="col-3">
            <input type="text" name={"label" + linkIndex} class="js-link-label form-control" placeholder="Link name" value={link.label} />
          </div>
          <div class="col-8">
            <input type="url" name={"url" + linkIndex} class="js-link-url form-control" placeholder="URL" value={link.url} />
          </div>
        </div>;
      })}
    </div>

    <script id="js-links-template" type="text/template" dangerouslySetInnerHTML={{ __html: `
            <input type="hidden" name="submit-links" value="true" />
            <% for (var i in links) { %>
            <div class="js-link mb-1">
                <div class="draggable cursor-pointer d-inline-block" style="width: 3%">
                    <span class="fas fa-bars"></span> 
                </div>
                <div style="width: 25%; display: inline-block">
                    <input type="text" name="label<%- i %>" class="js-link-label form-control" 
                      data-row="<%- i %>" placeholder="Link name" value="<%- links[i].label %>" />
                </div>
                <div style="width: 64%; display: inline-block">
                    <input type="url" class="js-link-url form-control" data-row="<%- i %>"
                      name="url<%- i %>" placeholder="URL" value="<%- links[i].url %>">
                </div>
                <div style="width: 5%; display: inline-block">
                    <input type="button" class="js-remove-link btn btn-sm btn-outline-secondary" data-row="<%- i %>" value="x" />
                </div>
                </div>
            </div>
            <% } %>
            <div class="form-group mb-0">
            <button class="js-add-link d-inline btn btn-outline-secondary mt-2">Add link</button>
            </div>
            `}} />
  </div>;
}
