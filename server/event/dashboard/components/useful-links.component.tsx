import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import forms from "server/core/forms";
import links from "server/core/links";
import { ifTrue } from "server/macros/jsx-utils";

export function eventDashboardUsefulLinks(event: BookshelfModel) {
  const rulesLink = forms.isId(event.get("status_rules"))
    ? links.routeUrl(event.get("status_rules"), "post")
    : event.get("status_rules");

  return <>
    {ifTrue(rulesLink !== "off", () =>
      <div class="list-group mb-1">
        {usefulLink(event, "status_rules", rulesLink, "Detailed rules", "fa-book", { big: true })}
      </div>
    )}

    <div class="list-group">
      {/* usefulLink(event, null, 'posts', 'Posts', 'fa-newspaper') */}
      {event.related("details").get("links").map(featuredLink =>
        usefulLink(event, null, featuredLink.link, featuredLink.title, featuredLink.icon)
      )}
    </div>
  </>;
}

function usefulLink(event, statusField, link, title, icon, options: { big?: boolean } = {}) {
  if (!statusField || event.get(statusField) !== "disabled") {
    const targetUrl = link.includes("/") ? link : links.routeUrl(event, "event", link);
    return <a class={"list-group-item shortcut " + (options.big ? "big" : "")} href={targetUrl}>
      <h4>
        <span class="shortcut__icon"><span class={"fas " + icon}></span></span>
        <span class="shortcut__title">{title}</span>
      </h4>
    </a>;
  }
}
