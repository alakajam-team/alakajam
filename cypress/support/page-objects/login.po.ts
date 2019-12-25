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

    get form() {
        return cy.get("form");
    }

}

export default new LoginPO();
