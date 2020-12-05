export class GameSearchBlockPO {

  public get title(): Cypress.Chainable {
    return cy.get("h1");
  }

  public get titleField(): Cypress.Chainable {
    return cy.get("input[name=search]");
  }

  public get eventSelect(): Cypress.Chainable {
    return cy.get("select[name=eventId]");
  }

  public get userSelect2Dropdown(): Cypress.Chainable {
    return cy.get("select[name=user]");
  }

  public get platformSelect(): Cypress.Chainable {
    return cy.get("select[name=platforms]");
  }

  public get tagSelect(): Cypress.Chainable {
    return cy.get("select[name=tags]");
  }

  public get applyButton(): Cypress.Chainable {
    return cy.get("input[type=submit]");
  }

  public get hideReviewedCheckbox(): Cypress.Chainable {
    return cy.get("input[name=hideReviewed]");
  }

  public get highScoreSupportCheckbox(): Cypress.Chainable {
    return cy.get("input[name=highScoresSupport]");
  }

  public get gamesList(): Cypress.Chainable {
    return cy.get(".game-grid");
  }

  public get gameLinks(): Cypress.Chainable {
    return cy.get(".entry-thumb");
  }

}

export default new GameSearchBlockPO();
