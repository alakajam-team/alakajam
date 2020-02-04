class PostPO {

  public visit({ postId }: { postId: number | string }) {
    cy.visit(`/post/${postId}`);
  }

  public writeNewComment(body: string) {
    this.commentEditor.type(body, { force: true });
    this.commentSaveButton.click();
  }

  // Header

  public get postTitle() {
    return cy.get(".post__title");
  }

  public get postEditButton() {
    return cy.get(".post .btn-outline-secondary");
  }

  public get commentCounter() {
    return cy.get(".post__comment-count");
  }

  public get likeCounter() {
    return cy.get(".js-like-button");
  }

  public get likeButton() {
    return this.likeCounter;
  }

  // Body

  public get postBody() {
    return cy.get(".post__body");
  }

  // Comments

  public get commentSectionTitle() {
    return cy.get("h2");
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

export default new PostPO();
