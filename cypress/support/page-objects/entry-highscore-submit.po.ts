class EntrySubmitScorePO {

  public visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
    cy.visit(`/${eventName}/${entryId}/test-entry/submit-score`);
  }

  public get scoreField() {
    return cy.get("input[name=score]");
  }

  public get scoreMinutesField() {
    return cy.get("input[name=score-mn]");
  }

  public get scoreSecondsField() {
    return cy.get("input[name=score-s]");
  }

  public get scoreMillisecondsField() {
    return cy.get("input[name=score-ms]");
  }

  public get proofPictureField() {
    return cy.get("input[type=file][name=upload]");
  }

  public get saveButton() {
    return cy.get(".btn-primary");
  }

  public get deleteButton() {
    cy.acceptFutureConfirms();
    return cy.get("input[name=delete]");
  }

}

export default new EntrySubmitScorePO();
