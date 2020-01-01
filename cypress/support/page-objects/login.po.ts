class LoginPO {

    public visit() {
        cy.visit("/login");
    }

    get nameField() {
        return cy.get("#name");
    }

    get passwordField() {
        return cy.get("#password");
    }

    get rememberMeField() {
        return cy.get("input[type=checkbox]");
    }

    get submitButton() {
        return cy.get("button[type=submit]");
    }

}

export default new LoginPO();
