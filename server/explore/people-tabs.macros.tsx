import React, { JSX } from "preact";

export function peopleTabs(path: string): JSX.Element {
  return <div class="list-group mb-3">
    { tab("/explore/people", "All members", path) }
    { tab("/explore/people/mods", "Admins & mods", path) }
  </div>;
}

function tab(linkPath, title, path) {
  return <a class={"list-group-item " + (path.replace(/\?.*/g, "") === linkPath ? "active" : "")} href={ linkPath }>
      { title }
    </a>;
}
