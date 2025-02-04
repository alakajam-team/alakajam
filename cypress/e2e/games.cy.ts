import { USER_DUMBLEDORE } from "../support/data";
import gamesPo from "../support/page-objects/games.po";

describe("Games page", () => {

  beforeEach(() => {
    gamesPo.visit();
  });

  it("lists games made during an event", () => {
    gamesPo.eventSelect.select2Dropdown("results out");
    gamesPo.applyButton.click();

    gamesPo.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games made for an external event", () => {
    gamesPo.eventSelect.select2Dropdown("external");
    gamesPo.applyButton.click();

    gamesPo.gamesList.should("contain.text", "Game search test #2");
  });

  it("lists games for a user", () => {
    gamesPo.userSelect2Dropdown.select2Dropdown("Administrator");
    gamesPo.applyButton.click();

    gamesPo.title.should("contain", "made by Administrator");
    gamesPo.gamesList.should("contain.text", "Administrator");
  });

  it("lists games searched by title", () => {
    gamesPo.titleField.type("Game search test #1");
    gamesPo.applyButton.click();

    gamesPo.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games by platform", () => {
    gamesPo.platformSelect.select2Search("Linux");
    gamesPo.applyButton.click();

    gamesPo.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games by tag", () => {
    gamesPo.tagSelect.select2Search("platformer");
    gamesPo.applyButton.click();

    gamesPo.gamesList.should("contain.text", "Game search test #1");
  });

  it("lists games with high score support", () => {
    gamesPo.highScoreSupportCheckbox.click();
    gamesPo.applyButton.click();

    gamesPo.gamesList.should("contain.text", "Game search test #1");
  });

  it("supports complex searches", () => {
    cy.loginAs(USER_DUMBLEDORE);
    gamesPo.visit();

    gamesPo.eventSelect.select2Dropdown("results out");
    gamesPo.titleField.type("Game search test #1");
    gamesPo.userSelect2Dropdown.select2Dropdown("Administrator");
    gamesPo.platformSelect.select2Search("Linux");
    gamesPo.tagSelect.select2Search("platformer");
    gamesPo.hideReviewedCheckbox.click();
    gamesPo.highScoreSupportCheckbox.click();
    gamesPo.applyButton.click();

    gamesPo.gamesList.should("contain.text", "Game search test #1");
  });

});
