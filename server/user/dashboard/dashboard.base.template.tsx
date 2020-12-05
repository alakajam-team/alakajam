import React, { JSX } from "preact";
import { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import * as formMacros from "server/macros/form.macros";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import * as userMacros from "server/user/user.macros";

export default function dashboardBase(context: CommonLocals, contentsBlock: JSX.Element) {
  const { dashboardUser, dashboardAdminMode, infoMessage, errorMessage, path } = context;

  const options = { dashboardAdminMode };

  return base(context, <div class="container-fluid">
    <div class="row">
      <div class="col-sm-4 col-md-3">
        <div class="list-group">
          <div class="list-group-item">
            <h4 style="margin: 0">User dashboard</h4>
          </div>
          <div class="list-group-item">
            {userMacros.userThumb(dashboardUser, { fullWidth: true, centered: true })}
          </div>
          {dashboardLink(dashboardUser, "feed", "Dashboard", path, options)}
          {dashboardLink(dashboardUser, "settings", "Settings", path, options)}
          {dashboardLink(dashboardUser, "entries", "Entries", path, options)}
          {dashboardLink(dashboardUser, "posts", "Posts", path, options)}
          {dashboardLink(dashboardUser, "scores", "Scores", path, options)}
          {dashboardLink(dashboardUser, "password", "Change password", path, options)}
        </div>
      </div>
      <div class="col-sm-8 col-md-9">
        {ifTrue(dashboardAdminMode, () =>
          <h2 style="margin-bottom: 20px">
            <span class="badge badge-danger">
              <span class="fas fa-user"></span>
              {dashboardUser.get("title")}
            </span>
          </h2>
        )}

        {ifSet(infoMessage, () =>
          <div class="alert alert-info">{infoMessage}</div>
        )}
        {ifSet(errorMessage, () =>
          <div class="alert alert-warning">{errorMessage}</div>
        )}

        {formMacros.alerts(context.alerts)}

        {contentsBlock}
      </div>
    </div>
  </div>
  );
}


function dashboardLink(dashboardUser, page, label, path, options) {
  const url = links.routeUrl(dashboardUser, "user", page, options);

  return <a href={url} class={"list-group-item"
    + (path.indexOf(url) === 0 ? " active" : "")
    + ((options.dashboardAdminMode && path === url) ? " list-group-item-danger" : "")}>
    {label}
  </a>;
}
