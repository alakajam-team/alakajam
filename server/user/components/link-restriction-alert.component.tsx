import React, { JSX } from "preact";
import links from "server/core/links";

export function linkRestrictionAlert(): JSX.Element {
  return <div class="alert alert-warning">
    <p><img src={links.staticUrl("/static/images/jellymancer/jellymancer_favicon32.png")} /> <b>Link restrictions for new accounts</b></p>
    <p>In order to fight against spam, new accounts cannot use hyperlinks (including in the bio and blog posts).<br />
      Restrictions will be lifted as soon as you submit your first entry to a jam. Thanks for your understanding!</p>
  </div>;
}
