import enums from "server/core/enums";
import forms from "server/core/forms";
import security from "server/core/security";
import highscoreService from "server/entry/highscore/highscore.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EntryLocals } from "../entry.middleware";

/**
 * Moderate high scores
 */
export async function entryHighscoresManage(req: CustomRequest, res: CustomResponse<EntryLocals>): Promise<void> {
  const { user, entry } = res.locals;

  if (!user) {
    res.redirect("/login?redirect=" + req.url);
    return;
  } else if (!security.canUserWrite(user, entry, { allowMods: true })) {
    res.errorPage(403);
    return;
  } else if (entry.get("status_high_score") === enums.ENTRY.STATUS_HIGH_SCORE.OFF) {
    res.errorPage(403, "High scores are disabled on this entry");
    return;
  }

  if (req.method === "POST") {
    for (const field in req.body) {
      if (field.includes("suspend") || field.includes("restore")) {
        const parsedField = field.split("-");
        const id = parsedField.length === 2 ? parsedField[1] : null;
        if (id && forms.isId(id)) {
          await highscoreService.setEntryScoreActive(parseInt(id, 10), field.includes("restore"));
        }
      } else if (field === "clearall") {
        await highscoreService.deleteAllEntryScores(entry);
      }
    }
  }

  res.render<EntryLocals>("entry/manage/entry-manage-scores", {
    ...res.locals,
    highScoresCollection: await highscoreService.findHighScores(entry, {
      fetchAll: true,
      withSuspended: true,
    }),
  });
}
