import React, { JSX } from "preact";
import links from "server/core/links";

export function unapprovedUserAlert(): JSX.Element {
  return <div class="alert alert-warning">
    <p><img src={links.staticUrl("/static/images/jellymancer/jellymancer_favicon32.png")} class="mr-2" />
      <b>Link restrictions for new accounts</b></p>
    <p>In order to fight against spam, new accounts cannot use hyperlinks in their bio, and some profile options are disabled.<br />
      Restrictions will be lifted as soon as your account is approved by a moderator. Thanks for your understanding!</p>
  </div>;
}
