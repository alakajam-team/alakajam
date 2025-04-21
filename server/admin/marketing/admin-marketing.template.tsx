import React, { JSX } from "preact";
import links from "server/core/links";
import { User } from "server/entity/user.entity";
import adminBase from "../admin.base";
import { AdminMarketingContext } from "./admin-marketing.controller";

export default function render(context: AdminMarketingContext): JSX.Element {
  const { notifiableUsers, sendgridCSVPages, sendGridContactLimit, user: readingUser } = context;

  return adminBase(context,
    <div>
      <h1>Marketing</h1>

      <p>List of all {notifiableUsers.length} users welcoming email notifications. Please spam sparingly :)</p>


      <h2>SendGrid contact lists</h2>

      <p>
        Due to a {sendGridContactLimit} contact and as many emails-per-day limit,
        we must swap contacts between these CSVs to run a full campaign.<br />
        {new Array(sendgridCSVPages).fill(true).map((_, i) =>
          <a class="btn btn-sm btn-primary mr-1" href={`/admin/marketing/csv?page=${i}`}>SendGrid CSV (batch #{i})</a>)}
      </p>

      <h2>Email addresses</h2>

      <p class="mb-3">
        <code>
          {notifiableUsers.map(u => u.email).join(", ")}
        </code>
      </p>

      <h2>Detailed list</h2>

      <table class="table">
        <thead>
          <th>Title</th>
          <th>Name</th>
          <th>Email</th>
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
  </tr>;
}
