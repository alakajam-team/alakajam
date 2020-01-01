import { EVENT_NAME_SUBMISSIONS_OPEN, EVENT_NAME_THEME_SHORTLIST, EVENT_NAME_THEME_VOTING, USER_ADMINISTRATOR } from "../support/data";
import eventEditPo from "../support/page-objects/event-edit.po";
import eventPo from "../support/page-objects/event.po";

describe("Event: Administration", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_ADMINISTRATOR);
  });

  afterEach(() => {
   // cy.restoreDB();
  });

  it("supports switching from theme submissions to theme shortlist phase", () => {
    eventEditPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "edit#state" });
    eventEditPo.themeVotingStatusRadio("shortlist").click();
    eventEditPo.saveButton.click();
    eventEditPo.alert.should("contain.text", "Theme shortlist computed");
  });

  it("supports publishing the theme shortlist results", () => {
    eventEditPo.visit({ eventName: EVENT_NAME_THEME_SHORTLIST, page: "edit#state" });
    eventEditPo.themeVotingStatusRadio("results").click();
    eventEditPo.saveButton.click();

    eventPo.visit({ eventName: EVENT_NAME_THEME_SHORTLIST, page: "themes" });
    eventPo.themeShortlistWinner.should("contain.text", "Dog");
  });

  it("supports publishing the game ratings results", () => {
    eventEditPo.visit({ eventName: EVENT_NAME_SUBMISSIONS_OPEN, page: "edit#state" });
    eventEditPo.entryResultsStatusRadio("results").click();
    eventEditPo.saveButton.click();
    eventEditPo.alert.should("contain.text", "Event results computed");
  });

});
