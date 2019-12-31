class RegisterPO {

    visit() {
        cy.visit("/register");
    }

    get alert() {
        return cy.get(".alert")
    }

    get name() {
        return cy.get("#name");
    }

    get emailField() {
        return cy.get("input[name=email]");
    }

    get timezoneSelect2Dropdown() {
        return cy.get("select[name=timezone]");
    }

    get password() {
        return cy.get("input[name=password]");
    }

    get passwordBis() {
        return cy.get("input[name=password-bis]");
    }

    get captcha() {
        return cy.get("input[name=captcha]");
    }
    
    get rememberMe() {
        return cy.get("input[type=checkbox]");
    }

    get submit() {
        return cy.get(".btn-primary");
    }

}

export default new RegisterPO();
