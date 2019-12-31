
class DashboardPostsPO {

    visit() {
        cy.visit(`/dashboard/posts`);
    }

    get createPostButton() {
        return cy.get(".btn-primary");
    }

    get postTitles() {
        return cy.get(".post__title");
    }

}

export default new DashboardPostsPO();
