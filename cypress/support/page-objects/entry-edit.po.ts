class EntryEditPO {

  public visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
    cy.visit(`/${eventName}/${entryId}/test-entry/edit`);
  }

  public get titleField() {
    return cy.get("input[name=title]");
  }

  public get descriptionField() {
    return cy.get("input[name=description]");
  }

  public get divisionButtons() {
    return cy.get(".entry__divisions");
  }

  public divisionButton(divisionName: string) {
    return this.divisionButtons.contains(divisionName);
  }

  public get selectedDivision() {
    return cy.get(".entry__divisions .active");
  }

  public get teamMembersSelect2Search() {
    return cy.get("select[name=members]");
  }

  public get graphicsOptout() {
    return cy.get("#edit-optouts label").eq(0);
  }

  public get audioOptout() {
    return cy.get("#edit-optouts label").eq(1);
  }

  public get linkLabelFields() {
    return cy.get(".js-link-label");
  }

  public get linkUrlFields() {
    return cy.get(".js-link-url");
  }

  public get linkDeleteButtons() {
    return cy.get(".js-remove-link");
  }

  public get addLinkButton() {
    return cy.get(".js-add-link");
  }

  public get bodyEditor() {
    return cy.getEditor();
  }

  public get platformsSelect2Search() {
    return cy.get("select[name=platforms]");
  }

  public get tagsSelect2Search() {
    return cy.get("select[name=tags]");
  }

  public get highScoresOffRadio() {
    return cy.get("label[for=enable-high-score-off]");
  }

  public get highScoresOnRadio() {
    return cy.get("label[for=enable-high-score-on]");
  }

  public get highScoresInstructionsField() {
    return cy.get("textarea[name=high-score-instructions]");
  }

  public get entryDeleteButton() {
    cy.acceptFutureConfirms();
    return cy.get(".btn-danger");
  }

  public get saveButton() {
    return cy.get("input[type=submit]");
  }

}

export default new EntryEditPO();
