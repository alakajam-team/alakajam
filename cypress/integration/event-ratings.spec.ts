import { GANDALF_RANKED_GAME, USER_DUMBLEDORE } from "../support/data";
import po from "../support/page-objects";

const { entry } = po;

describe("Event: Ratings", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_DUMBLEDORE);
  });

  afterEach(() => {
    cy.restoreDB();
  });

  it("supports changing submitted themes", () => {
    entry.visit(GANDALF_RANKED_GAME);

    cy.scrollElementsToScreenCenter();
    entry.votingStar("Awesomeness", 5).click();
    entry.votingStar("Beauty", 8).click();

    entry.votingRow("Awesomeness").should("contain.text", "5");
    entry.votingRow("Beauty").should("contain.text", "8");
  });

});
