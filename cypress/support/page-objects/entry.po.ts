class EntryPO {

  public visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
    cy.visit(`/${eventName}/${entryId}`);
  }

  public writeNewComment(body: string) {
    this.commentEditor.type(body, { force: true });
    this.commentSaveButton.click();
  }

  // Header

  public get entryTitle() {
    return cy.get("h1");
  }

  public get entryEditButton() {
    return cy.get("h1 .btn-outline-primary");
  }

  // Body

  public get entryInfos() {
    return cy.get(".entry__info-value");
  }

  public get description() {
    return cy.get(".entry__description");
  }

  public get body() {
    return cy.get(".post");
  }

  public get votingBlock() {
    return cy.get(".entry-voting, .entry-results");
  }

  public votingRow(categoryTitle: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(".entry-voting__category-title")
      .contains(categoryTitle)
      .parent();
  }

  public votingRanking(categoryTitle: string) {
    return this.votingRow(categoryTitle)
      .find(".entry-results__category-ranking");
  }

  public votingRating(categoryTitle: string) {
    return this.votingRow(categoryTitle)
      .find(".entry-results__category-rating");
  }

  public votingStar(categoryTitle: string, rating: number) {
    return this.votingRow(categoryTitle)
      .find(".js-star")
      .eq(rating);
  }

  public votingSuccessIcon() {
    return cy.get(".show-if-saving-success");
  }

  public get links() {
    return cy.get(".entry__links");
  }

  public get authors() {
    return cy.get(".user-thumb");
  }

  public get highScores() {
    return cy.get("table.table tbody tr");
  }

  public get highScoreSubmitButton() {
    return cy.get("[name=high-scores] .btn-primary");
  }

  public get highScoreManageButton() {
    return cy.get("[name=high-scores] .fa-cog");
  }

  // Comments

  public get commentSectionTitle() {
    return cy.get("h2");
  }

  public get commentCounter() {
    return cy.get("h2 > i");
  }

  public get commentEditButton() {
    return cy.get(".comment__details .fa-pencil-alt").first();
  }

  public get commentSaveButton() {
    return cy.get("input[name=save]").first();
  }

  public get commentDeleteButton() {
    return cy.get("input[name=delete]");
  }

  public get comments() {
    return cy.get(".comment");
  }

  public get commentEditor() {
    return cy.getEditor();
  }

}

export default new EntryPO();
