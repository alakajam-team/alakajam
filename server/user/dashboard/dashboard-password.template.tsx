import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import dashboardBase from "./dashboard.base.template";

export default function render(context: CommonLocals) {
  const { dashboardUser, dashboardAdminMode } = context;

  return dashboardBase(context,
    <div>
      <h1>Change password</h1>

      <div class="row">
        <div class="col-lg-6">

          <form action={links.routeUrl(dashboardUser, "user", "password", { dashboardAdminMode })} method="post">
            {context.csrfToken()}

            <div class="form-group">
              <label for="password">Current password</label>
              {ifFalse(dashboardAdminMode, () =>
                <input type="password" class="form-control" id="password" name="password" autofocus />
              )}
              {ifTrue(dashboardAdminMode, () =>
                <input type="password" class="form-control" placeholder="Admin mode enabled" disabled />
              )}
            </div>
            <div class="form-group">
              <label for="password">New password</label>
              <input type="password" class="form-control" id="new-password" name="new-password" />
            </div>

            <div class="form-group">
              <label for="password-bis">Repeat new password</label>
              <input type="password" class="form-control" id="new-password-bis" name="new-password-bis" />
            </div>

            <div class="form-group">
              <input type="submit" class="btn btn-primary" name="action-password" value="Change password" />
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
