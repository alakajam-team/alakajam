import enums from "server/core/enums";
import fileStorage from "server/core/file-storage";
import forms from "server/core/forms";
import highscoreService from "server/entry/highscore/entry-highscore.service";
import tournamentService from "server/event/tournament/tournament.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EntryLocals } from "../entry.middleware";

/**
 * Submit a high score
 */
export async function entryHighscoreSubmit(req: CustomRequest, res: CustomResponse<EntryLocals>) {
  const { user, entry } = res.locals;

  if (!user) {
    res.redirect("/login?redirect=" + req.url);
    return;
  } else if (entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    res.errorPage(403, "High scores are disabled on this entry");
    return;
  }

  // Fetch existing score, handle deletion
  let entryScore = await highscoreService.findEntryScore(user.get("id"), entry.get("id"));
  if (req.method === "POST" && req.body.delete && entryScore) {
    await highscoreService.deleteEntryScore(entryScore, entry);
    entryScore = null;
  }
  if (!entryScore) {
    entryScore = await highscoreService.createEntryScore(user.get("id"), entry.get("id"));
  }

  let rankingPercent;
  if (entryScore.get("ranking")) {
    rankingPercent = Math.floor(100 * entryScore.get("ranking") / entry.related("details").get("high_score_count"));
  }

  // Score submission
  let errorMessage;
  if (req.method === "POST" && !req.body.delete) {
    // Validation
    const isExternalProof = req.body.proof !== "upload";
    let score: any = forms.sanitizeString(req.body.score) || "0";
    score = score.replace(/,/g, ".").replace(/ /g, ""); // give some flexibility to number parsing

    if (req.body["score-mn"] || req.body["score-s"] || req.body["score-ms"]) {
      let minutes = req.body["score-mn"] || 0;
      let seconds = req.body["score-s"] || 0;
      let milliseconds = req.body["score-ms"] || 0;

      if (!forms.isInt(minutes, { min: 0, max: 999 })) {
        errorMessage = "Invalid minutes";
        minutes = 0;
      }
      if (!forms.isInt(seconds, { min: 0, max: 59 })) {
        errorMessage = "Invalid seconds";
        seconds = 0;
      }
      if (!forms.isInt(milliseconds, { min: 0, max: 999 })) {
        errorMessage = "Invalid milliseconds";
        milliseconds = 0;
      }
      score = parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + parseInt(milliseconds, 10) * 0.001;
    } else if (!forms.isFloat(score)) {
      errorMessage = "Invalid score";
    }
    if (isExternalProof && req.body.proof && !forms.isURL(req.body.proof)) {
      errorMessage = "Invalid proof URL";
    }

    // Store score & proof
    entryScore.set("score", score);
    if (isExternalProof) {
      entryScore.set("proof", forms.sanitizeString(req.body.proof));
    } else {
      if (req.file || req.body["upload-delete"]) {
        const proofPath = `/scores/${entry.get("id")}/${entryScore.get("user_id")}`;
        const result = await fileStorage.savePictureToModel(entryScore,
          "proof", req.file, req.body["upload-delete"], proofPath);
        if ("error" in result) {
          errorMessage = result.error;
        }
      } else {
        entryScore.set("proof", req.body.upload);
      }
    }

    // Saving
    if (!errorMessage) {
      const result = await highscoreService.submitEntryScore(entryScore, entry);
      if ("error" in result) {
        errorMessage = result.error;
      } else {
        entryScore = result;
      }

      if (!errorMessage && req.query.redirectTo) {
        res.redirect(req.query.redirectTo);
        return;
      }
    }
  }

  // Force header to the featured event if a tournament is on, to make navigation less confusing
  const tournamentEvent = await tournamentService.findActiveTournamentPlaying(entry.get("id"));
  if (tournamentEvent) {
    (res.locals as any).event = res.locals.featuredEvent;
  }

  // Build context
  const context: any = {
    highScoresCollection: await highscoreService.findHighScores(entry),
    tournamentEvent,
    entryScore,
    rankingPercent,
    errorMessage,
    isExternalProof: highscoreService.isExternalProof(entryScore),
  };
  if (entry.related("details").get("high_score_type") === "time") {
    // Parse time
    const durationInSeconds = entryScore.get("score");
    if (durationInSeconds) {
      context.scoreMn = Math.floor(durationInSeconds / 60);
      context.scoreS = Math.floor(durationInSeconds) - context.scoreMn * 60;
      context.scoreMs = Math.round(1000 * (durationInSeconds - Math.floor(durationInSeconds)));
    }
  }

  res.render("entry/highscore/entry-highscore-submit", context);
}
