class LoginPO {

  public visit() {
    cy.visit("/login");
  }

  public get nameField() {
    return cy.get("#name");
  }

  public get passwordField() {
    return cy.get("#password");
  }

  public get rememberMeField() {
    return cy.get("input[type=checkbox]");
  }

  public get submitButton() {
    return cy.get("button[type=submit]");
  }

}

export default new LoginPO();
