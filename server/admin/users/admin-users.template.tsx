import React, { JSX } from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import { ifTrue } from "server/macros/jsx-utils";
import adminBase, { AdminBaseContext } from "../admin.base";

export default function render(context: AdminBaseContext & { users: User[] }): JSX.Element {
  const { newUsers, unapprovedUsers, modsAndAdmins } = context;

  return adminBase(context,
    <>
      {usersTable("Unapproved users", unapprovedUsers, { specialClass: "alert alert-danger" })}
      {usersTable("Newest users", newUsers)}
      {usersTable("Mods and admins", modsAndAdmins, { showModAdmin: true })}
    </>);
}

function usersTable(title: string, users: User[], options: { showModAdmin?: boolean; specialClass?: string } = {}): JSX.Element {
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
        {users.map(someUser =>
          <tr>
            <td><a href={links.routeUrl(someUser, "user")}>{someUser.get("title")}</a></td>
            <td>{someUser.get("name")}</td>
            {ifTrue(options.showModAdmin, () => <td>{specialUserBadge(someUser)}</td>)}
            <td><a class="btn btn-primary btn-sm" href={links.routeUrl(someUser, "user", "settings", { dashboardAdminMode: true })}>Manage</a></td>
          </tr>
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
