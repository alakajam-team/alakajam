import React, { JSX } from "preact";
import links from "server/core/links";
import { User } from "server/entity/user.entity";
import adminBase from "../admin.base";
import { AdminMarketingContext } from "./admin-marketing.controller";

export default function render(context: AdminMarketingContext): JSX.Element {
  const { notifiableUsers, user: readingUser } = context;

  return adminBase(context,
    <div>
      <h1>Marketing</h1>

      <p>Please spam sparingly :)</p>

      <h2>Users welcoming email notifications <span class="legend">({notifiableUsers.length})</span></h2>

      <h3>Email addresses</h3>
      <p class="mb-3">
        <code>
          {notifiableUsers.map(u => u.email).join(", ")}
        </code>
      </p>

      <h3>Detailed list</h3>

      <table class="table">
        <thead>
          <th>Title</th>
          <th>Name</th>
          <th>Email</th>
          {/* <th>Last notified</th> */}
        </thead>
        <tbody>{notifiableUsers.map(user => userRow(user, { readingUser }))}</tbody>
      </table>

    </div>);
}


function userRow(user: User, _options: { readingUser: User }): JSX.Element {
  return <tr>
    <td><a href={links.routeUrl(user, "user")}>{user.title}</a></td>
    <td>{user.name}</td>
    <td>{user.email}</td>
    {/* <td>{formatDate(user.marketing.last_notified_at, options.readingUser, constants.DATE_TIME_FORMAT)}</td> */}
  </tr>;
}
