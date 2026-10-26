import { clickAndWaitForLoad, loginAs, restoreDB } from "../support/commands";
import { ADMIN_TOURNAMENT_GAME_1, ADMIN_TOURNAMENT_GAME_2, DEFAULT_PICTURE, EVENT_NAME_LIVE_TOURNAMENT, USER_GANDALF } from "../support/data";
import EventPO from "../support/page-objects/event.po";
import { expect, test } from "../support/test";

async function expectTournamentRanking(eventPo: EventPO, rowIndex: number, username: string, points: string) {
  // Tournament scores are refreshed asynchronously after high score changes, so reload until they're up to date
  await expect(async () => {
    await eventPo.visit({ eventName: EVENT_NAME_LIVE_TOURNAMENT, page: "tournament-leaderboard" });
    await expect(eventPo.tournamentRankings.nth(rowIndex)).toContainText(username, { timeout: 1000 });
    await expect(eventPo.tournamentRankings.nth(rowIndex)).toContainText(points, { timeout: 1000 });
  }).toPass();
}

test.describe("Event: Tournament", () => {

  test.beforeEach(async ({ page }) => {
    await restoreDB(page.request);
    await loginAs(page, USER_GANDALF);
  });

  test.afterAll(async ({ request }) => {
    await restoreDB(request);
  });

  test("updates tournament rankings upon submitting, updating and deleting high scores", async ({ entryHighscoreSubmitPo, eventPo }) => {
    // 1. Insert score

    await entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_1);
    await entryHighscoreSubmitPo.scoreField.fill("300");
    await entryHighscoreSubmitPo.proofPictureField.setInputFiles(DEFAULT_PICTURE);
    await clickAndWaitForLoad(entryHighscoreSubmitPo.saveButton);

    /*
      Expected high scores:
      #	User	          Score
      1	@Dumbledore     500 pixels
      2 @Gandalf        300 pixels <<<<
      3	@Administrator  150 pixels
    */

    await expectTournamentRanking(eventPo, 2, USER_GANDALF, "12"); // 12 points for 2nd place

    // 2. Update score

    await entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_1);
    await entryHighscoreSubmitPo.scoreField.fill("900");
    await clickAndWaitForLoad(entryHighscoreSubmitPo.saveButton);

    /*
      Expected high scores:
      #	User	          Score
      1 @Gandalf        900 pixels <<<<
      2	@Dumbledore     500 pixels
      3	@Administrator  150 pixels
    */

    await expectTournamentRanking(eventPo, 2, USER_GANDALF, "15"); // 15 points for 1st place

    // 3. Create time-based score

    await entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_2);
    await entryHighscoreSubmitPo.typeTimeScore("5", "0", "0");
    await entryHighscoreSubmitPo.proofPictureField.setInputFiles(DEFAULT_PICTURE);
    await clickAndWaitForLoad(entryHighscoreSubmitPo.saveButton);

    /*
      Expected high scores for 2nd game:
      #	User	Time
      2 @Gandalf        5'00"000 <<<<
      1	@Administrator	5'59"140
      2	@Dumbledore   	6'50"100
    */

    await expectTournamentRanking(eventPo, 0, USER_GANDALF, "30"); // 15+15 = 30 points

    // 4. Delete score

    await entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_2);
    await clickAndWaitForLoad(entryHighscoreSubmitPo.deleteButton);

    await expectTournamentRanking(eventPo, 2, USER_GANDALF, "15"); // 15 points for 1st place
  });

});
