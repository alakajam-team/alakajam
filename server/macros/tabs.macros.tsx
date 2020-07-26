import * as React from "preact";
import { JSX } from "preact";

export function peopleTabs(path: string): JSX.Element {
  return <ul class="nav nav-tabs">
    { tab("/people", "All members", path) }
    { tab("/people/mods", "Admins & mods", path) }
  </ul>;
}

function tab(linkPath, title, path) {
  return <li class="nav-item">
    <a class={"nav-link " + (path.replace(/\?.*/g, "") === linkPath ? "active" : "")} href={ linkPath }>
      { title }
    </a>
  </li>;
}
