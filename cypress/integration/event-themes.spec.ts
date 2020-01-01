import { EVENT_NAME_THEME_SHORTLIST, EVENT_NAME_THEME_VOTING, USER_DUMBLEDORE } from "../support/data";
import po from "../support/page-objects";

const { event } = po;

describe("Event: Themes", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_DUMBLEDORE);
  });

  afterEach(() => {
    cy.restoreDB();
  });

  it.only("supports changing submitted themes", () => {
    event.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "themes" });

    event.themeIdeaManageButton.click();
    event.themeIdeaDeleteButtons.first().click();
    event.themeIdeaFields.first().clear().type("A much better theme idea");
    event.themeIdeasSaveButton.click();

    event.themeIdeas.should("contain.text", "A much better theme idea");
  });

  it("saves theme votes", () => {
    event.visit({ eventName: EVENT_NAME_THEME_VOTING, page: "themes" });

    event.themeUpvote.click();
    event.themePastVotes.should("have.length", 1);

    event.themeDownvote.click();
    event.themePastVotes.should("have.length", 2);
  });

  it("saves theme shortlist votes", () => {
    event.visit({ eventName: EVENT_NAME_THEME_SHORTLIST, page: "themes" });

    event.enableThemeShortlistSubmitButton();
    event.themeShortlistSubmitButton.click();
  });

});
