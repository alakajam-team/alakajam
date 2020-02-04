class UserProfilePO {

  public visit(userName: string) {
    cy.visit(`/user/${userName}`);
  }

  public get userDisplayName() {
    return cy.get(".profile__title");
  }

  public get userName() {
    return cy.get(".profile__name");
  }

  public get userBio() {
    return cy.get(".featured");
  }

  // Tabs

  public get alakajamGamesTab() {
    return cy.get("a[href=#entries]");
  }

  public get otherGamesTab() {
    return cy.get("a[href=#entries-ext]");
  }

  public get postsTab() {
    return cy.get("a[href=#posts]");
  }

  public get highScoresTab() {
    return cy.get("a[href=#scores]");
  }

  // Tab contents

  public get tabContents() {
    return cy.get(".tab-content");
  }

}

export default new UserProfilePO();
