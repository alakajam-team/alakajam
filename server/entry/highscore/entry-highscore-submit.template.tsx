import leftPad from "left-pad";
import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { ordinal } from "server/core/formats";
import forms from "server/core/forms";
import links from "server/core/links";
import { markdown } from "server/core/templating-filters";
import * as scoreMacros from "server/entry/highscore/entry-highscore.macros";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";

export default function render(context: CommonLocals) {
  const { entry, entryScore, errorMessage, scoreMn, scoreS, scoreMs,
    isExternalProof, tournamentEvent, highScoresCollection } = context;

  formMacros.registerEditorScripts(context);

  const instructions = entry.related("details").get("high_score_instructions");

  return base(context,

    <div class="container">
      <div class="row">
        <div class="col-12">
          <h1><a href={links.routeUrl(entry, "entry")}>{entry.get("title")}</a></h1>
        </div>
      </div>
      <div class="row">
        <div class="col-md-8">
          {ifSet(entryScore.get("id"), () =>
            <h2>Update your high score</h2>
          )}
          {ifNotSet(entryScore.get("id"), () =>
            <h2>Submit your high score</h2>
          )}

          {ifTrue(errorMessage, () =>
            <div class="alert alert-warning">{errorMessage}</div>
          )}

          {ifTrue(instructions, () =>
            <div class="card card-body" dangerouslySetInnerHTML={markdown(entry.related("details").get("high_score_instructions"))} />
          )}

          {ifTrue(entryScore.get("ranking"), () =>
            <div class="featured">
              <h4 style="margin: 0">Current ranking: <span class="badge badge-secondary">{ordinal(entryScore.get("ranking"))}</span></h4>
            </div>
          )}

          <form method="post" enctype="multipart/form-data">
            {context.csrfToken()}
            <div class="form-group">
              <label for="score" class="d-none d-sm-block">{entry.related("details").get("high_score_type") === "time" ? "Time" : "Score"}</label>
              {ifTrue(entry.related("details").get("high_score_type") === "time", () => {
                const hasScore = entryScore.get("score");
                return <div class="form-inline">
                  <label for="score-mn" class="visible-xs">Minutes</label>
                  <input type="number" name="score-mn" class="form-control input-lg no-spinner"
                    value={forms.parseInt(hasScore ? (scoreMn || "0") : (scoreMn || ""))}
                    placeholder="minutes" style="width: 120px" min="0" max="999" autofocus /><span class="d-none d-sm-block"> ' </span>
                  <label for="score-mn" class="visible-xs">Seconds</label>
                  <input type="text" name="score-s" class="form-control input-lg js-fixed-digits" data-digits="2"
                    value={leftPad(forms.parseInt(hasScore ? (scoreS || "0") : (scoreS || "")), 2, "0")}
                    placeholder="seconds" style="width: 120px" /><span class="d-none d-sm-block"> " </span>
                  <label for="score-mn" class="visible-xs">Milliseconds</label>
                  <input type="text" name="score-ms" class="form-control input-lg js-fixed-digits"
                    value={leftPad(forms.parseInt(hasScore ? (scoreMs || "0") : (scoreMs || "")), 3, "0")}
                    placeholder="milliseconds" style="width: 170px" />
                </div>;
              })}
              {ifTrue(entry.related("details").get("high_score_type") !== "time", () =>
                <input type="text" name="score" class="form-control input-lg" value={parseFloat(entryScore.get("score"))} autofocus />
              )}
            </div>
            <div class="form-group">
              <label for="proof-method">Proof picture</label>
              <div class="row mb-3">
                <div class="col-2">
                  <label style="font-weight: normal">
                    <input id="proof-method-upload" name="proof" value="upload" class="js-radio"
                      type="radio" checked={!isExternalProof} /> Upload
                  </label>
                </div>
                <div class="col-10">
                  {formMacros.pictureInput("upload", !isExternalProof ? entryScore.get("proof") : undefined, { model: entryScore })}
                </div>
              </div>
              <div class="row">
                <div class="col-2">
                  <label style="font-weight: normal">
                    <input id="proof-method-link" name="proof" value={isExternalProof ? entryScore.get("proof") : undefined} class="js-radio"
                      type="radio" checked={isExternalProof} /> Link
                  </label>
                </div>
                <div class="col-10">
                  <input type="text" class="form-control js-radio-text-field" value={isExternalProof ? entryScore.get("proof") : undefined}
                    data-target="proof-method-link" placeholder="http://..." />
                </div>
              </div>
            </div>
            <div class="form-group">
              <input type="submit" class="btn btn-primary" value="Submit" />
              {ifTrue(entryScore.get("id"), () =>
                <input type="submit" name="delete" class="btn btn-outline-primary ml-1"
                  value="Delete" onclick="return confirm('Delete your high score?')" />
              )}
            </div>
          </form>
        </div>
        <div class="col-md-4">
          <h2>High scores</h2>
          {eventMacros.entryThumb(entry)}
          {scoreMacros.tournamentEventBanner(tournamentEvent)}
          {scoreMacros.highScores(entry, highScoresCollection, entryScore, { hideSubmitButton: true })}
        </div>
      </div>
    </div>
  );
}
