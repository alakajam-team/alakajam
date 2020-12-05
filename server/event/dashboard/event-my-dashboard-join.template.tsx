import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";

export default function render(context: CommonLocals): JSX.Element {
  const { event } = context;

  const participationCount = event.related("details").get("participation_count");

  return base(context,
    <div class="container thin">
      <h1>My {event.get("title")} dashboard</h1>

      <div class="card card-body">
        <p>Click the link below to join the event and access your participation dashboard.</p>

        <p><a href={links.routeUrl(event, "event", "join")} class="btn btn-lg btn-alt">Join event</a></p>

        <p><b>{participationCount} person{participationCount !== 0 ? "s" : ""}</b> joined so far
          {participationCount < 10 ? ", be among the first to join the event" : ""}!</p>
      </div>
    </div>
  );
}
