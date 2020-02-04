class HeaderPO {

  public get avatar() {
    return cy.get(".dropdown .navbar-avatar");
  }

  public get notificationCount() {
    return cy.get(".navbar-unread-notifications");
  }

  public get openButton() {
    return cy.get(".dropdown-toggle");
  }

  public get dashboardLink() {
    return cy.get(".dropdown-menu a").eq(1);
  }

  public get settingsLink() {
    return cy.get("a[href=/dashboard/settings]");
  }

  public get myEntriesLink() {
    return cy.get("a[href=/dashboard/entries]");
  }

  public get myPostsLink() {
    return cy.get("a[href=/dashboard/posts]");
  }

  public get myScoresLink() {
    return cy.get("a[href=/dashboard/scores]");
  }

  public get logoutLink() {
    return cy.get("a[href=/logout]");
  }

}

export default new HeaderPO();
