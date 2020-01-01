class DashboardPasswordPO {

    public visit() {
        cy.visit(`/dashboard/password`);
    }

    get alert() {
        return cy.get(".alert");
    }

    get currentPasswordField() {
        return cy.get("input[name=password]");
    }

    get newPasswordField() {
        return cy.get("input[name=new-password]");
    }

    get newPasswordBisField() {
        return cy.get("input[name=new-password-bis]");
    }

    get saveButton() {
        return cy.get("input[type=submit]");
    }

}

export default new DashboardPasswordPO();
