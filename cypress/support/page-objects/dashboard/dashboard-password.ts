import site from "..";

class DashboardPasswordPO {

    visit() {
        cy.visit(`/dashboard/password`);
    }

    get alert() {
        return cy.get(".alert")
    }

    get currentPasswordField() {
        return cy.get("input[name=password]}");
    }

    get newPasswordField() {
        return cy.get("input[name=new-password]}");
    }

    get newPasswordBisField() {
        return cy.get("input[name=new-password-bis]}");
    }

    get chagePasswordButton() {
        return cy.get("input[type=submit]");
    }


}

export default new DashboardPasswordPO();
