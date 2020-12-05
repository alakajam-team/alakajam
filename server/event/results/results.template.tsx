import { capitalize } from "lodash";
import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import enums from "server/core/enums";
import { ordinal } from "server/core/formats";
import { digits } from "server/core/templating-filters";
import * as eventMacros from "server/event/event.macros";
import { ifFalse, ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { resultsPost, event, user, userLikes, rankings, categoryTitles, division, sortedBy } = context;
  const hasEventBanner = event.related("details").get("background");
  let currentRanking;

  return base(context,
    <div>
      {eventMacros.eventBanner(event)}

      {ifSet(resultsPost, () =>
        <div class={"container thin " + (hasEventBanner ? "event-banner-offset" : "")}>
          {postMacros.post(resultsPost, { readingUser: user, readingUserLikes: userLikes })}
        </div>
      )}

      {ifNotSet(resultsPost, () => {
        const flags = event.related("details").get("flags");
        const scoreSpacePodium = flags.scoreSpacePodium && sortedBy === 7;

        return <div class="container">
          <div class="row">
            <div class="col">
              {podium(rankings, event, categoryTitles, division, sortedBy, { scoreSpacePodium })}
              {pageLinks(event, event.get("divisions"), categoryTitles, division, sortedBy)}
            </div>
          </div>

          {ifTrue(rankings.length > 0 && division !== enums.DIVISION.UNRANKED, () =>
            <div class="row">
              <div class={`col-sm-9 col-md-${12 - categoryTitles.length} mb-3`}>&nbsp;</div>
              {categoryTitles.map((title, index) =>
                ifFalse(flags.scoreSpacePodium && index + 1 === 7, () =>
                  <div class={"col-sm-2 col-md-1 text-center " +((index - 1) !== sortedBy ? "d-none d-md-block" : "")}>
                    <span style="font-weight: bold">{categoryTitles[index]}</span>
                  </div>
                )
              )}
            </div>
          )}

          {rankings.map(entry =>
            <div>
              {ifTrue(division !== enums.DIVISION.UNRANKED, () =>
                <div class="row">
                  <div class="col-sm-2 col-md-1 text-center text-sm-right">
                    {ifTrue(!currentRanking || currentRanking !== entry.related("details").get("ranking_" + sortedBy), () => {
                      currentRanking = entry.related("details").get("ranking_" + sortedBy);
                      return <h2>{ordinal(currentRanking)}</h2>;
                    })}
                  </div>
                  <div class={`col-sm-7 col-md-${11 - categoryTitles.length} mb-1`}>
                    {eventMacros.entrySmallThumb(entry)}
                  </div>
                  {categoryTitles.map((title, index) => {
                    const categoryIndex = index + 1;
                    if (!(flags.scoreSpacePodium && categoryIndex === 7)) {
                      const rating = entry.related("details").get("rating_" + categoryIndex);
                      return <div class={"col-sm-2 col-md-1 text-center " + (categoryIndex !== sortedBy ? "d-none d-md-block" : "")}
                        style={categoryIndex === sortedBy ? "background-color: #FAFAFA;" : ""}>
                        <h4 style="line-height: 50px; vertical-align: middle;">
                          {rating > 0 ? digits(rating, 3) : "N.A."}
                        </h4>
                      </div>;
                    }
                  })}
                </div>
              )}
              {ifTrue(division === enums.DIVISION.UNRANKED, () =>
                <div class="col-sm-6 mb-1">
                  {eventMacros.entrySmallThumb(entry)}
                </div>
              )}
            </div>
          )}

          <div class="row">
            <div class="col-sm-12 mt-3">
              {pageLinks(event, event.get("divisions"), categoryTitles, division, sortedBy)}
            </div>
          </div>
        </div>;

      })}
    </div>
  );
}

function pageLinks(event, divisions, categoryTitles, selectedDivision, selectedCategoryIndex) {
  if (divisions.solo || categoryTitles.length > 1) {
    return <div class="text-center results-links">
      <span class="btn-group mr-sm-4 mb-2">
        {["solo", "team", "unranked"].map(division =>
          <a href={`?sortBy=${selectedCategoryIndex}&division=${division}`} type="button"
            class={`btn btn-primary results-links__division ${selectedDivision === division ? "active" : ""}`}>
            <span class={constants.DIVISION_ICONS[division]}></span>&nbsp;
            {capitalize(division)}
          </a>
        )}
      </span>
      {ifTrue(selectedDivision !== "unranked", () => {
        const flags = event.related("details").get("flags");
        return <span class="btn-group mb-2">
          {categoryTitles.map((title, index) => {
            if (title) {
              const categoryIndex = index + 1;
              return <a href={`?sortBy=${categoryIndex}&division=${!(flags.scoreSpacePodium && categoryIndex === 7)
                ? selectedDivision : ""}`} type="button"
              class={"btn btn-primary results-links__category " + (selectedCategoryIndex === categoryIndex ? "active" : "")}>
                <span class={`entry-results__category-medal medal-category-${categoryIndex} medal-ranking-1`}></span>&nbsp;
                <span class="d-none d-lg-inline">{categoryTitles[index]}</span>
              </a>;
            }
          })}
        </span>;
      })}
    </div>;
  }
}

function podium(rankings, event, categoryTitles, division, sortedBy, options: { scoreSpacePodium?: boolean } = {}) {
  return <div class="results-podium">
    <h1 class="results-podium__event-name">{event.get("title")} results</h1>
    <h2 class="results-podium__title">
      <div class="dropdown">
        {ifFalse(options.scoreSpacePodium, () =>
          <button class="dropdown-toggle" type="button" data-toggle="dropdown">
            <span class={constants.DIVISION_ICONS[division]}></span>
            <span class="ml-1">{capitalize(division)} division</span>
          </button>
        )}
        <div class="dropdown-menu">
          {Object.keys(event.get("divisions")).map(title =>
            <a class="dropdown-item" href={`?sortBy=${sortedBy}&division=${title}`}>
              {capitalize(title)} division
            </a>
          )}
        </div>
      </div>
      {ifTrue(division !== enums.DIVISION.UNRANKED, () =>
        <>
          <div class="dropdown">
            <button class="dropdown-toggle" type="button" data-toggle="dropdown">  {categoryTitles[sortedBy - 1]}</button>
            <div class="dropdown-menu">
              {categoryTitles.map((_title, index) =>
                <a class="dropdown-item" href={`?sortBy=${index + 1}&division=${division}`}>
                  {categoryTitles[index]}
                </a>
              )}
            </div>
          </div>
          {options.scoreSpacePodium ? "" : "rankings"}
        </>
      )}
      {ifTrue(division === enums.DIVISION.UNRANKED, () =>
        "(everyone wins!)"
      )}
      {ifFalse(options.scoreSpacePodium, () =>
        <span class="results-podium__counter">
          {event.related("details").get("division_counts")[division]}
          entries (out of {event.get("entry_count")})
        </span>
      )}
    </h2>

    <div class="container thin pb-2">
      <div class="results-podium-row">
        {podiumSteps(rankings, categoryTitles, division, sortedBy, options)}
      </div>
    </div>
  </div>;

}

function podiumSteps(rankings, categoryTitles, division, sortedBy, options) {
  const entryThumbOptions = { hideMedals: categoryTitles.length === 1 };

  if (rankings.length > 0 && division !== enums.DIVISION.UNRANKED) {
    const podiumStepEls = [];

    const trophyPos1 = " ranking-" + rankings[0].related("details").get("ranking_" + sortedBy);
    podiumStepEls.push(<div class={"col-md-4 position-1"
      + (!options.scoreSpacePodium ? trophyPos1 : " award") + " results-podium__step"}>
      {eventMacros.entryThumb(rankings[0], entryThumbOptions)}
      {ifTrue(options.scoreSpacePodium, () => <span class="award-label">Streamer's<br />Choice</span>)}
    </div>);

    const trophyPos2 = rankings.length >= 2 ? " ranking-" + rankings[1].related("details").get("ranking_" + sortedBy) : "";
    podiumStepEls.push(<div class={"col-md-4 position-2"
      + (!options.scoreSpacePodium ? trophyPos2 : " award") + (rankings.length >= 2 ? " results-podium__step" : "")}>
      {ifTrue(rankings.length >= 2, () =>
        <div>
          {eventMacros.entryThumb(rankings[1], entryThumbOptions)}
          {ifTrue(options.scoreSpacePodium, () => <span class="award-label">Solo Developer's<br />Choice</span>)}
        </div>
      )}
    </div>);

    const trophyPos3 = rankings.length >= 3 ? " ranking-" + rankings[2].related("details").get("ranking_" + sortedBy) : "";
    podiumStepEls.push(<div class={"col-md-4 position-3"
      + (!options.scoreSpacePodium ? trophyPos3 : " award") + (rankings.length >= 3 ? " results-podium__step" : "")}>
      {ifTrue(rankings.length >= 3, () =>
        <div>
          {eventMacros.entryThumb(rankings[2], entryThumbOptions)}
          {ifTrue(options.scoreSpacePodium, () => <span class="award-label">Team Developer's<br />Choice</span>)}
        </div>
      )}
    </div>);

    return podiumStepEls;
  } else if (rankings.length > 0 && division === enums.DIVISION.UNRANKED) {
    return <>
      <h2 class="col-12 text-center m-3">Random picks</h2>
      <div class="col-sm-4 col-10 first unranked">
        {eventMacros.entryThumb(rankings[0], entryThumbOptions)}
      </div>
      <div class="col-sm-4 col-10 second unranked">
        {ifTrue(rankings.length >= 2, () =>
          eventMacros.entryThumb(rankings[1], entryThumbOptions)
        )}
      </div>
      <div class="col-sm-4 col-10 third unranked">
        {ifTrue(rankings.length >= 3, () =>
          eventMacros.entryThumb(rankings[2], entryThumbOptions)
        )}
      </div>
    </>;

  } else {
    return <h2 class="text-center">No entries</h2>;
  }
}
