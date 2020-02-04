class DashboardFeedPO {

  public visit() {
    cy.visit("/dashboard/feed");
  }

  public get invites() {
    return cy.get("[data-test=invites]");
  }

  public get inviteAcceptButton() {
    return cy.get("[data-test=invites] .btn-primary");
  }

  public get inviteDeclineButton() {
    return cy.get("[data-test=invites] .btn-outline-primary");
  }

  public get notifications() {
    return cy.get("[data-test=notifications]");
  }

}

export default new DashboardFeedPO();
