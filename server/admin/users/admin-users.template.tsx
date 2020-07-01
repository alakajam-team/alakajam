import * as React from "preact";
import links from "server/core/links";
import security from "server/core/security";
import { User } from "server/entity/user.entity";
import adminBase, { AdminBaseContext } from "../admin.base";

export default function render(context: AdminBaseContext & { users: User[] }) {
  const { users } = context;

  return adminBase(context,
    <div>
      <h1>Users</h1>

      <table class="table sortable">
        <thead>
          <th>Title</th>
          <th>Name</th>
          <th>Mod/Admin</th>
          <th></th>
        </thead>
        <tbody>
          {users.map(someUser =>
            <tr>
              <td><a href={links.routeUrl(someUser, 'user')}>{someUser.get('title')}</a></td>
              <td>{someUser.get('name')}</td>
              <td>{specialUserBadge(someUser)}
              </td>
              <td><a class="btn btn-primary btn-sm" href={links.routeUrl(someUser, 'user', 'settings', { dashboardAdminMode: true })}>Edit</a></td>
            </tr>
          )}
        </tbody>
      </table>

    </div>)
}

function specialUserBadge(user: User) {
  if (security.isAdmin(user)) {
    return <span class="badge badge-danger">Administrator</span>;
  } else if (security.isMod(user)) {
    return <span class="badge badge-warning">Moderator</span>;
  }
}