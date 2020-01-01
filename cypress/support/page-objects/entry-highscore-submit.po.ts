class EntrySubmitScorePO {

    public visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
        cy.visit(`/${eventName}/${entryId}/test-entry/submit-score`);
    }

    get scoreField() {
        return cy.get("input[name=score]");
    }

    get scoreMinutesField() {
        return cy.get("input[name=score-mn]");
    }

    get scoreSecondsField() {
        return cy.get("input[name=score-s]");
    }

    get scoreMillisecondsField() {
        return cy.get("input[name=score-ms]");
    }

    get proofPictureField() {
        return cy.get("input[type=file][name=upload]");
    }

    get saveButton() {
        return cy.get(".btn-primary");
    }

    get deleteButton() {
        cy.acceptFutureConfirms();
        return cy.get("input[name=delete]");
    }

}

export default new EntrySubmitScorePO();
