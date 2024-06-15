import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import adminBase, { AdminBaseContext } from "../admin.base";
import { userQuickActions } from "./admin-user-actions";

export default function render(context: AdminBaseContext & { users: User[] }): JSX.Element {
  const { newUsers, unapprovedUsers, modsAndAdmins, csrfToken } = context;

  return adminBase(context,
    <>
      {usersTable("Unapproved users", unapprovedUsers,
        { specialClass: "alert alert-danger", details: unapprovedUserDetails, csrfToken })}
      {usersTable("Newest users", newUsers, { csrfToken })}
      {usersTable("Mods and admins", modsAndAdmins, { showModAdmin: true, csrfToken })}
    </>);
}

function usersTable(title: string, users: User[], options: {
  showModAdmin?: boolean;
  specialClass?: string;
  details?: (user: User) => JSX.Element;
  csrfToken: () => JSX.Element;
}): JSX.Element {
  const { csrfToken } = options;

  return <>
    <h1>{title} <span class="legend">({users.length})</span></h1>
    <table class={"table sortable " + (options.specialClass || "")}>
      <thead>
        <th>Title</th>
        <th>Name</th>
        {ifTrue(options.showModAdmin, () => <th>Mod/Admin</th>)}
        <th></th>
      </thead>
      <tbody>
        {users.map(user =>
          <>
            <tr>
              <td><a href={links.routeUrl(user, "user")}>{user.get("title")}</a></td>
              <td>{user.get("name")}</td>
              {ifTrue(options.showModAdmin, () => <td>{specialUserBadge(user)}</td>)}
              <td class="btn-group float-right">{userQuickActions(user, { csrfToken, redirectTo: "/admin/users" })}</td>
            </tr>
            {ifSet(options.details, () => <tr><td colspan={3} class="pt-0 pb-3">
              {options.details(user)}
            </td></tr>)}
          </>
        )}
      </tbody>
    </table>
  </>;
}

function specialUserBadge(user: User) {
  if (security.isAdmin(user)) {
    return <span class="badge badge-danger">Administrator</span>;
  } else if (security.isMod(user)) {
    return <span class="badge badge-warning">Moderator</span>;
  }
}

function unapprovedUserDetails(user: User) {
  return <>{ifSet(user.details.body, () =>
    <div dangerouslySetInnerHTML={{ __html: user.details.body }}></div>)}</>;
}
