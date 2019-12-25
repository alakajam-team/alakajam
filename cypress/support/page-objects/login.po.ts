class LoginPO {

    visit() {
        cy.visit("/login");
    }

    get name() {
        return cy.get("#name");
    }

    get password() {
        return cy.get("#password");
    }

    get rememberMe() {
        return cy.get("input[type=checkbox]");
    }

    get form() {
        return cy.get("form");
    }

}

export default new LoginPO();
