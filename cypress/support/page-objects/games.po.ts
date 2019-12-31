export class GameSearchBlockPO {

    get title() {
        return cy.get("h1");
    }

    get titleField() {
        return cy.get("input[name=search]");
    }

    get eventSelect() {
        return cy.get("select[name=eventId]");
    }

    get userSelect() {
        return cy.get("select[name=user]");
    }

    get platformSelect() {
        return cy.get("select[name=platforms]");
    }

    get tagSelect() {
        return cy.get("select[name=tags]");
    }

    get applyButton() {
        return cy.get("input[type=submit]");
    }

    get hideReviewedCheckbox() {
        return cy.get("input[name=hideReviewed]");
    }

    get highScoreSupportCheckbox() {
        return cy.get("input[name=highScoresSupport]");
    }

    get gamesList() {
        return cy.get(".game-grid");
    }

}

class GamesPO extends GameSearchBlockPO {

    visit() {
        cy.visit("/games");
    }

}

export default new GamesPO();
