class DashboardPasswordPO {

  public visit() {
    cy.visit("/dashboard/password");
  }

  public get alert() {
    return cy.get(".alert");
  }

  public get currentPasswordField() {
    return cy.get("input[name=password]");
  }

  public get newPasswordField() {
    return cy.get("input[name=new-password]");
  }

  public get newPasswordBisField() {
    return cy.get("input[name=new-password-bis]");
  }

  public get saveButton() {
    return cy.get("input[type=submit]");
  }

}

export default new DashboardPasswordPO();
