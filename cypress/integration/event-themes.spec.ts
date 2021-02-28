import { EVENT_NAME_THEME_SHORTLIST, EVENT_NAME_THEME_VOTING, USER_DUMBLEDORE } from "../support/data";
import eventPo from "../support/page-objects/event.po";

describe("Event: Themes", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_DUMBLEDORE);
  });

  after(() => {
    cy.restoreDB();
  });

  it("supports changing submitted themes", () => {
    eventPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "themes" });

    eventPo.themeIdeaManageButton.click();
    eventPo.themeIdeaDeleteButtons.first().click();
    eventPo.themeIdeaFields.first().clear().type("A much better theme idea");
    eventPo.themeIdeasSaveButton.click();

    eventPo.themeIdeas.should("contain.text", "A much better theme idea");
  });

  it("saves theme votes", () => {
    eventPo.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "themes" });

    eventPo.themeUpvote.click();
    eventPo.themePastVotes.should("have.length", 1);

    eventPo.themeDownvote.click();
    eventPo.themePastVotes.should("have.length", 2);
  });

  it("saves theme shortlist votes", () => {
    eventPo.visit({ eventName: EVENT_NAME_THEME_SHORTLIST, page: "themes" });

    eventPo.enableThemeShortlistSubmitButton();
    eventPo.themeShortlistSubmitButton.click();
  });

});
