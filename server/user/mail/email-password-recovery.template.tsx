import React, { JSX } from "preact";
import links from "server/core/links";

export default function render(context: Record<string, any>): JSX.Element {
  const { rootUrl, token, user } = context;

  const link = rootUrl + "/passwordRecovery?token=" + token;

  return <html>
    <body>
      <p>Hi {user.get("title") || user.get("name")},</p>

      <p>Password recovery has been requested for your username <b>{user.get("name")}</b>.
        If you are the person who made this request, please use the following link within 24 hours to choose a new password:</p>

      <p><a href={link}>{link}</a></p>

      <p>If you did not make this request, you can safely ignore this email.
        Password recovery requests can be made by anyone, so your account is safe.</p>

      <p>Best,</p>

      <p>The Jamician</p>

      <p><a href={rootUrl}><img src={links.staticUrl("/static/images/jamician.png")} height="150" /></a></p>
    </body>
  </html >;
}
