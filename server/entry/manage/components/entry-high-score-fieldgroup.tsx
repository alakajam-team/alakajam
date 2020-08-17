import * as React from "preact";
import * as formMacros from "server/macros/form.macros";

export function highscoreFieldGroup(entry) {
  const entryDetails = entry.related("details");
  const highScoreEnabled = entry.get("status_high_score") && entry.get("status_high_score") !== "off";
  const isCustomUnit = entryDetails.get("high_score_type") && !["number", "time"].includes(entryDetails.get("high_score_type"));

  return <div>
    <div class="form-group">
      <label for="enable-high-score">Enable high scores
        {formMacros.tooltip("Players will be able to submit their scores with a screenshot as proof.")}</label>
      <div>
        {formMacros.radio("enable-high-score", "off", "Off", highScoreEnabled ? "" : "off")}
        {formMacros.radio("enable-high-score", "on", "On", highScoreEnabled ? "on" : "")}
        <span class="js-high-score-details">
        </span>
      </div>
    </div>

    <div class="js-high-score-details">
      <div class="form-group">
        <label for="high-score-unit">Score unit</label>
        <div class="row">
          <div class="col-md-6 col-12 form-inline">
            {formMacros.radio("high-score-type", "number", "Number", entryDetails.get("high_score_type") || "number")}
            {formMacros.radio("high-score-type", "time", "Time", entryDetails.get("high_score_type"))}
            {formMacros.radio("high-score-type", "custom", "Custom unit", isCustomUnit ? "custom" : "")}
            <input type="text" name="custom-unit" class="form-control js-custom-unit-input"
              value={isCustomUnit ? entryDetails.get("high_score_type") : ""} size={5} />
          </div>
          <div class="col-md-6 col-12 form-inline">
            {formMacros.check("high-score-reversed", "Lower score is better", entry.get("status_high_score") === "reversed")}
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="high-score-instructions">Score submission instructions
          {formMacros.tooltip("You can use this text to specify which score to submit, or "
            + "which game mode to use, what must appear is the proof screenshot, etc. Markdown allowed.")}</label>
        <textarea name="high-score-instructions" class="form-control">{entryDetails.get("high_score_instructions")}</textarea>
      </div>
      <div class="form-group">
        {formMacros.check("allow-tournament-use", "Allow game use for tournaments",
          entryDetails.get("allow_tournament_use"), { noMargin: true })}{" "}
        <a href="/article/docs/akj-tournament-rules" target="_blank">(learn more)</a>
      </div>
    </div>

  </div>;
}
