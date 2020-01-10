class DashboardFeedPO {

    public visit() {
        cy.visit(`/dashboard/feed`);
    }

    get invites() {
        return cy.get("[data-test=invites]");
    }

    get inviteAcceptButton() {
        return cy.get("[data-test=invites] .btn-primary");
    }

    get inviteDeclineButton() {
        return cy.get("[data-test=invites] .btn-outline-primary");
    }

    get notifications() {
        return cy.get("[data-test=notifications]");
    }

}

export default new DashboardFeedPO();
