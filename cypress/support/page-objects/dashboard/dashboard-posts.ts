import site from "..";

class DashboardPostsPO {

    visit() {
        cy.visit(`/dashboard/posts`);
    }

    get createPostButton() {
        return cy.get(".btn-primary");
    }

}

export default new DashboardPostsPO();
