import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import * as formMacros from "server/macros/form.macros";
import { ifSet, ifTrue } from "server/macros/jsx-utils";

export interface AdminBaseContext extends CommonLocals {
  infoMessage?: string;
  errorMessage?: string;
}

export default function adminBase(context: AdminBaseContext, contentsBlock: JSX.Element): JSX.Element {
  const { path, devMode, user, infoMessage, errorMessage, alerts, modNotifications } = context;

  return base(context,
    <div class="container">
      <div class="row">
        <div class="col-sm-3">
          <div class="list-group">
            <div class="list-group-item list-group-item-default"><h4>Moderation</h4></div>
            {link("Announcements", "/admin", path, { exactCheck: true })}
            {link("Events", "/admin/events", path)}
            {link("Users", "/admin/users", path, {
              badgeSlot: () => <span class="badge badge-danger ml-2">{ modNotifications } pending</span>
            })}
            {link("Settings", "/admin/settings", path)}
          </div>

          {ifTrue(user && user.get("is_admin") || config.DEBUG_ADMIN, () =>
            <div class="list-group mt-3">
              <div class="list-group-item list-group-item-default"><h4>Administration</h4></div>
              {link("Marketing", "/admin/marketing", path)}
              {link("Event presets", "/admin/event-presets", path, { isAdminLink: true })}
              {link("Event templates", "/admin/event-templates", path, { isAdminLink: true })}
              {link("Platforms", "/admin/platforms", path, { isAdminLink: true })}
              {link("Tags", "/admin/tags", path, { isAdminLink: true })}
              {link("Server status", "/admin/status", path, { isAdminLink: true })}
              {ifSet(devMode, () =>
                link("Developer tools", "/admin/dev", path, { isAdminLink: true })
              )}
            </div>
          )}

        </div>
        <div class="col-sm-9">
          {formMacros.alerts(alerts)}
          {ifSet(infoMessage, () =>
            <div class="alert alert-info">{infoMessage}</div>
          )}
          {ifSet(errorMessage, () =>
            <div class="alert alert-warning">{errorMessage}</div>
          )}

          {contentsBlock}
        </div>
      </div>
    </div>
  );
}

function link(label: string, targetPath: string, currentPath: string,
    options: { isAdminLink?: boolean; exactCheck?: boolean; badgeSlot?: () => JSX.Element } = {}) {
  const colorClass = options.isAdminLink ? "list-group-item-danger" : "list-group-item-warning";
  const isLinkActive = currentPath === targetPath || (!options.exactCheck && currentPath.indexOf(targetPath) === 0);
  return <a href={targetPath} class={"list-group-item " + (isLinkActive ? colorClass : "")}>
    {label}
    {ifSet(options.badgeSlot, () => options.badgeSlot())}
  </a>;
}
