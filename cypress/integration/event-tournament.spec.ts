import { ADMIN_TOURNAMENT_GAME_1, ADMIN_TOURNAMENT_GAME_2, EVENT_NAME_LIVE_TOURNAMENT, USER_GANDALF } from "../support/data";
import entryHighscoreSubmitPo from "../support/page-objects/entry-highscore-submit.po";
import eventPo from "../support/page-objects/event.po";

describe("Event: Tournament", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_GANDALF);
  });

  afterEach(() => {
    cy.restoreDB();
  });

  it("updates tournament rankings upon submitting, updating and deleting high scores", () => {
    // 1. Insert score

    entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_1);
    entryHighscoreSubmitPo.scoreField.clear().type("300");
    entryHighscoreSubmitPo.proofPictureField.dropFile();
    entryHighscoreSubmitPo.saveButton.click();

    /*
      Expected high scores:
      #	User	          Score
      1	@Dumbledore     500 pixels
      2 @Gandalf        300 pixels <<<<
      3	@Administrator  150 pixels
    */

    eventPo.visit({ eventName: EVENT_NAME_LIVE_TOURNAMENT, page: "tournament-leaderboard" });
    eventPo.tournamentRankings.eq(2).should("contain.text", USER_GANDALF);
    eventPo.tournamentRankings.eq(2).should("contain.text", "12"); // 12 points for 2nd place

    // 2. Update score

    entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_1);
    entryHighscoreSubmitPo.scoreField.clear().type("900");
    entryHighscoreSubmitPo.saveButton.click();

    /*
      Expected high scores:
      #	User	          Score
      1 @Gandalf        900 pixels <<<<
      2	@Dumbledore     500 pixels
      3	@Administrator  150 pixels
    */

    eventPo.visit({ eventName: EVENT_NAME_LIVE_TOURNAMENT, page: "tournament-leaderboard" });
    eventPo.tournamentRankings.eq(2).should("contain.text", USER_GANDALF);
    eventPo.tournamentRankings.eq(2).should("contain.text", "15"); // 15 points for 1st place

    // 3. Create time-based score

    entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_2);
    entryHighscoreSubmitPo.scoreMinutesField.clear().type("5");
    entryHighscoreSubmitPo.scoreSecondsField.clear().type("0");
    entryHighscoreSubmitPo.scoreMillisecondsField.clear().type("0");
    entryHighscoreSubmitPo.proofPictureField.dropFile();
    entryHighscoreSubmitPo.saveButton.click();

    /*
      Expected high scores for 2nd game:
      #	User	Time
      2 @Gandalf        5'00"000 <<<<
      1	@Administrator	5'59"140
      2	@Dumbledore   	6'50"100
    */

    eventPo.visit({ eventName: EVENT_NAME_LIVE_TOURNAMENT, page: "tournament-leaderboard" });
    eventPo.tournamentRankings.first().should("contain.text", USER_GANDALF);
    eventPo.tournamentRankings.first().should("contain.text", "30"); // 15+15 = 30 points

    // 4. Delete score

    entryHighscoreSubmitPo.visit(ADMIN_TOURNAMENT_GAME_2);
    entryHighscoreSubmitPo.deleteButton.click();

    eventPo.visit({ eventName: EVENT_NAME_LIVE_TOURNAMENT, page: "tournament-leaderboard" });
    eventPo.tournamentRankings.eq(2).should("contain.text", USER_GANDALF);
    eventPo.tournamentRankings.eq(2).should("contain.text", "15"); // 15 points for 1st place
  });

});
