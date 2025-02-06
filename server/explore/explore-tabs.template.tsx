import React from "preact";

export function exploreTabs(currentPath: string) {
  return <ul class="nav nav-tabs nav-justified mb-4">
    <li role="presentation" class="nav-item">
      <a class={"nav-link " + activeIfPath(currentPath, "/explore/events")} href="/explore/events">Events</a>
    </li>
    <li role="presentation" class="nav-item">
      <a class={"nav-link " + activeIfPath(currentPath, "/explore/games")} href="/explore/games">Games</a>
    </li>
    <li role="presentation" class="nav-item">
      <a class={"nav-link " + activeIfPath(currentPath, "/explore/people")} href="/explore/people">Users</a>
    </li>
  </ul>
}

function activeIfPath(currentPath: string, path: string) {
  return (currentPath.startsWith(path) ? "active" : "")
}
