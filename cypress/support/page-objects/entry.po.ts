import site from ".";

class EntryPO {

    public visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
        cy.visit(`/${eventName}/${entryId}`);
    }

    public writeNewComment(body: string) {
        this.commentEditor.type(body, { force: true });
        this.commentSaveButton.click();
    }

    // Header

    get entryTitle() {
        return cy.get("h1");
    }

    get entryEditButton() {
        return cy.get("h1 .btn-default");
    }

    // Body

    get entryInfos() {
        return cy.get(".entry__info-value");
    }

    get description() {
        return cy.get(".entry__description");
    }

    get body() {
        return cy.get(".post");
    }

    get votingBlock() {
        return cy.get(".entry-voting, .entry-results");
    }

    public votingRow(categoryTitle: string): Cypress.Chainable<JQuery<HTMLElement>> {
        return cy.get(".entry-voting__category-title")
            .contains(categoryTitle)
            .parent();
    }

    public votingRanking(categoryTitle: string) {
        return this.votingRow(categoryTitle)
            .find(".entry-results__category-ranking");
    }

    public votingRating(categoryTitle: string) {
        return this.votingRow(categoryTitle)
            .find(".entry-results__category-rating");
    }

    public votingStar(categoryTitle: string, rating: number) {
        return this.votingRow(categoryTitle)
            .find(".js-star")
            .eq(rating);
    }

    get links() {
        return cy.get(".entry__links");
    }

    get authors() {
        return cy.get(".user-thumb");
    }

    get highScores() {
        return cy.get("table.table tbody tr");
    }

    get highScoreSubmitButton() {
        return cy.get("[name=high-scores] .btn-primary");
    }

    get highScoreManageButton() {
        return cy.get("[name=high-scores] .fa-cog");
    }

    // Comments

    get commentSectionTitle() {
        return cy.get("h2");
    }

    get commentCounter() {
        return cy.get("h2 > i");
    }

    get commentEditButton() {
        return cy.get(".comment__details .fa-pencil-alt").first();
    }

    get commentSaveButton() {
        return cy.get("input[name=save]").first();
    }

    get commentDeleteButton() {
        return cy.get("input[name=delete]");
    }

    get comments() {
        return cy.get(".comment");
    }

    get commentEditor() {
        return site.getEditor();
    }

}

export default new EntryPO();
