import { USER_DUMBLEDORE } from "../support/data";
import po from "../support/page-objects";

describe("Games page", () => {
  const games = po.games;

  beforeEach(() => {
    games.visit();
  })

  it("lists games made during an event", () => {
    games.eventSelect.select2Dropdown("results out");
    games.applyButton.click();

    games.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games made for an external event", () => {
    games.eventSelect.select2Dropdown("external");
    games.applyButton.click();

    games.gamesList.should("contain.text", "Game search test #2");
  });

  it("lists games for a user", () => {
    games.userSelect.select2Dropdown("Administrator");
    games.applyButton.click();

    games.title.should("contain", "made by Administrator");
    games.gamesList.should("contain.text", "Administrator");
  });

  it("lists games searched by title", () => {
    games.titleField.type("Game search test #1");
    games.applyButton.click();

    games.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games by platform", () => {
    games.platformSelect.select2Search("Linux");
    games.applyButton.click();

    games.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games by tag", () => {
    games.tagSelect.select2Search("platformer");
    games.applyButton.click();

    games.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games with high score support", () => {
    games.highScoreSupportCheckbox.click();
    games.applyButton.click();

    games.gamesList.should("contain.text", "Game search test #1");
  });

  it("supports complex searches", () => {
    cy.loginAs(USER_DUMBLEDORE);
    games.visit();

    games.eventSelect.select2Dropdown("results out");
    games.titleField.type("Game search test #1");
    games.userSelect.select2Dropdown("Administrator");
    games.platformSelect.select2Search("Linux");
    games.tagSelect.select2Search("platformer");
    games.hideReviewedCheckbox.click();
    games.highScoreSupportCheckbox.click();
    games.applyButton.click();

    games.gamesList.should("contain.text", "Game search test #1");
  });

});
