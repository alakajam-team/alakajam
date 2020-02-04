class PostEditPO {

  public visit({ postId }: { postId: number | string }) {
    cy.visit(`/post/${postId}/edit`);
  }

  // Header

  public get titlePreview() {
    return cy.get(".post__title");
  }

  // Body

  public get titleInput() {
    return cy.get("input[name=title]");
  }

  public get relatedEventDropdown() {
    return cy.get("select[name=event-id]");
  }

  public get editor() {
    return cy.getEditor();
  }

  // Actions

  public get publishButton() {
    return cy.get("input[name=publish]");
  }

  public get saveButton() {
    return cy.get("input[name=save]").first();
  }

  public get saveDraftButton() {
    return cy.get("input[name=save-draft]");
  }

  public get unpublishButton() {
    return cy.get("input[name=unpublish]");
  }

  public get deleteButton() {
    cy.acceptFutureConfirms();
    return cy.get(".btn-danger");
  }

  public get scheduleButton() {
    return cy.get("input[value='Schedule...']");
  }

  public get publishedAtField() {
    return cy.get("input[name=published-at]");
  }

  public get saveScheduleButton() {
    return cy.get("input[name=save-custom]");
  }

}

export default new PostEditPO();
