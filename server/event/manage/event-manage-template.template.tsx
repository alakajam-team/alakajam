import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";

export default function render(context: CommonLocals) {
  const { eventTemplates } = context;

  return base(context,

    <div class="container">
      <div class="row">
        <div class="col-12">
          <h1>Create event</h1>

          <form action={links.routeUrl(null, "event", "create")} method="get">
            <div class="form-group">
              <label for="logo">Template</label>
              <div>
                <select name="event-template-id" class="js-select" style="width: 30%"
                  data-placeholder="None (Create from scratch)" data-allow-clear="true">
                  <option value=""></option>
                  {eventTemplates.map(eventTemplate =>
                    <option value={eventTemplate.get("id")}>
                      {eventTemplate.get("title")}
                    </option>
                  )}
                </select>
              </div>
            </div>
            <div class="form-group">
              <button type="submit" class="btn btn-primary">Continue</button>
              <button class="btn btn-outline-primary" onclick="window.history.back(); return false;">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
