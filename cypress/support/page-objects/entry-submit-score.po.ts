class EntrySubmitScorePO {

    visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
        cy.visit(`/${eventName}/${entryId}/submit-score`);
    }

    get scoreField() {
        return cy.get("input[name=score]");
    }

    get proofPictureField() {
        return cy.get("input[name=upload]");
    }

    get saveButton() {
        return cy.get(".btn-primary");
    }

}

export default new EntrySubmitScorePO();
