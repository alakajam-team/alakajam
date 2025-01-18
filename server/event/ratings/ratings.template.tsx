import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { divisionLabel } from "server/entry/view/components/division-label";
import * as eventMacros from "server/event/event.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { ratingCount, votesPerCategory } = context;

  return base(context,

    <div class="container event-ratings">
      <h1>Ratings <span class="count">({ratingCount})</span></h1>
      <ul class="nav nav-tabs">
        {votesPerCategory.map((votesCategory, index) =>
          <li role="presentation" class="nav-item">
            <a class={"nav-link " + (index === 0 ? "active" : "")} data-toggle="tab" href={"#tab-" + votesCategory.title}>
              <h3>{votesCategory.title}</h3>
            </a>
          </li>
        )}
      </ul>
      <div class="tab-content">
        {votesPerCategory.map((votesCategory, index) => {
          const categoryIndex = index + 1;
          return <div id={"tab-" + votesCategory.title } class={"event-ratings__tab tab-pane show " + (index === 0 ? "active" : "")}>
            <div class="row">
              {Object.entries(votesCategory.votesPerDivision).map(([division, votes]: [string, any]) =>
                <div class="col-sm-6">
                  <div class="row">
                    <div class="col-10 offset-2"><h4>{divisionLabel(division)} entries <span class="count">({votes.length})</span></h4></div>
                  </div>
                  {votes.map(vote =>
                    <div class="row">
                      <div class="col-2">
                        <div class="event-ratings__score">{vote.get("vote_" + categoryIndex)}</div>
                      </div>
                      <div class="col-10 event-ratings__entry">
                        {eventMacros.entrySmallThumb(vote.related("entry"), { noShadow: true })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}
