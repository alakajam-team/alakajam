class UserProfilePO {

    public visit(userName: string) {
        cy.visit(`/user/${userName}`);
    }

    get userDisplayName() {
        return cy.get(".profile__title");
    }

    get userName() {
        return cy.get(".profile__name");
    }

    get userBio() {
        return cy.get(".featured");
    }

    // Tabs

    get alakajamGamesTab() {
        return cy.get("a[href=#entries]");
    }

    get otherGamesTab() {
        return cy.get("a[href=#entries-ext]");
    }

    get postsTab() {
        return cy.get("a[href=#posts]");
    }

    get highScoresTab() {
        return cy.get("a[href=#scores]");
    }

    // Tab contents

    get tabContents() {
        return cy.get(".tab-content");
    }

}

export default new UserProfilePO();
