import React, { JSX } from "preact";
import { ArticleLink, ArticleSidebarCategory } from "server/core/settings";

export function sidebar(sidebarParam: ArticleSidebarCategory, path: string, options: { class?: string } = {}): JSX.Element {
  return <div class={options.class}>
    {sidebarParam.map(sidebarGroup =>
      sidebarLinks(sidebarGroup.title, sidebarGroup.links, path)
    )}
  </div>;
}

function sidebarLinks(title: string, links: ArticleLink[], path: string) {
  if (links) {
    return <>
      <div class="list-group sidebar">
        <div class="list-group-item">
          <h3>{title}</h3>
        </div>
        {links.map(link =>
          <>
            {sidebarLink(link.title, link.url, path)}
            {link.subLinks?.map(subLink =>
              sidebarSubLink(subLink.title, subLink.url, path)
            )}
          </>
        )}
      </div>
      <div class="spacing"></div>
    </>;
  }
}

function sidebarLink(label: string, url: string, path: string, options: { dashboardAdminMode?: boolean } = {}) {
  return <a href={url} class={"list-group-item sidebar__link " + (path === url ? "active" : "")
    + (options.dashboardAdminMode && path === url ? "list-group-item-danger" : "")}>
    {label}
  </a>;
}

function sidebarSubLink(label: string, url: string, path: string, options: { dashboardAdminMode?: boolean } = {}) {
  return <a href={url} class={"list-group-item sidebar__link " + (path === url ? "active" : "")
    + (options.dashboardAdminMode && path === url ? "list-group-item-danger" : "")}>
    <span class="ml-3">{label}</span>
  </a>;
}
