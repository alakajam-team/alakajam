import * as React from "preact";

export function sidebar(sidebarParam, path, options: { class?: string } = {}) {
  return <div class={options.class}>
    {sidebarParam.map(sidebarGroup =>
      sidebarLinks(sidebarGroup.title, sidebarGroup.links, path)
    )}
  </div>;
}

function sidebarLinks(title: string, links, path: string) {
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

function sidebarLink(label, url, path, options: { dashboardAdminMode?: boolean } = {}) {
  return <a href={url} class={"list-group-item sidebar__link " + (path === url ? "active" : "")
    + (options.dashboardAdminMode && path === url ? "list-group-item-danger" : "")}>
    {label}
  </a>;
}

function sidebarSubLink(label, url, path, options: { dashboardAdminMode?: boolean } = {}) {
  return <a href={url} class={"list-group-item sidebar__link " + (path === url ? "active" : "")
    + (options.dashboardAdminMode && path === url ? "list-group-item-danger" : "")}>
    <span class="ml-3">{label}</span>
  </a>;
}
