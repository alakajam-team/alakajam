class DashboardPostsPO {

  public visit() {
    cy.visit("/dashboard/posts");
  }

  public get createPostButton() {
    return cy.get(".btn-primary");
  }

  public get postTitles() {
    return cy.get(".post__title");
  }

}

export default new DashboardPostsPO();
