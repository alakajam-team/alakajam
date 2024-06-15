import React, { JSX } from "preact";
import links from "server/core/links";
import { User } from "server/entity/user.entity";
import { ifSet } from "server/macros/jsx-utils";

export function userQuickActions(user: User, options: { csrfToken?: () => JSX.Element; redirectTo?: string } = {}): JSX.Element {
  return <>
    {ifSet(options.csrfToken, () =>
      <form method="post" action={"/dashboard/settings?user=" + user.get("name")} class="btn-group float-right">
        {options.csrfToken()}
        <input type="hidden" name="redirectTo" value={options.redirectTo ?? "/"} />
        <button type="submit" name="approve" value="true" class="btn btn-primary btn-sm">Approve</button>
        <button type="submit" name="delete" value="true" class="btn btn-danger btn-sm"
          onclick={`return confirm('Delete user ${user.get("title")}?')`}>Delete</button>
        <a class="btn btn-secondary btn-sm" href={links.routeUrl(user, "user", "settings", { dashboardAdminMode: true })}>Manage</a>
      </form>)}
  </>;
}
