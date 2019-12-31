
class DashboardPostsPO {

    visit() {
        cy.visit(`/dashboard/posts`);
    }

    get postTitles() {
        return cy.get(".post__title");
    }

}

export default new DashboardPostsPO();
