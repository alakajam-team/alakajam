class EntrySubmitScorePO {

    public visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
        cy.visit(`/${eventName}/${entryId}/submit-score`);
    }

    get scoreField() {
        return cy.get("input[name=score]");
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
