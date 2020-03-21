export class GameSearchBlockPO {

  public get title() {
    return cy.get("h1");
  }

  public get titleField() {
    return cy.get("input[name=search]");
  }

  public get eventSelect() {
    return cy.get("select[name=eventId]");
  }

  public get userSelect2Dropdown() {
    return cy.get("select[name=user]");
  }

  public get platformSelect() {
    return cy.get("select[name=platforms]");
  }

  public get tagSelect() {
    return cy.get("select[name=tags]");
  }

  public get applyButton() {
    return cy.get("input[type=submit]");
  }

  public get hideReviewedCheckbox() {
    return cy.get("input[name=hideReviewed]");
  }

  public get highScoreSupportCheckbox() {
    return cy.get("input[name=highScoresSupport]");
  }

  public get gamesList() {
    return cy.get(".game-grid");
  }

  public get gameLinks() {
    return cy.get(".entry-thumb");
  }

}

export default new GameSearchBlockPO();
