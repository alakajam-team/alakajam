import site from ".";

class EntryEditPO {

    visit({ eventName, entryId }: { eventName: string; entryId: number | string }) {
        cy.visit(`/${eventName}/${entryId}/test-entry/edit`);
    }

    get titleField() {
        return cy.get("input[name=title]");
    }

    get descriptionField() {
        return cy.get("input[name=description]");
    }
    
    get divisionButtons() {
        return cy.get(".entry__divisions");
    }

    divisionButton(divisionName: string) {
        return this.divisionButtons.contains(divisionName);
    }

    get selectedDivision() {
        return cy.get(".entry__divisions .active");
    }

    get teamMembersSelect2Search() {
        return cy.get("select[name=members]");
    }
    
    get graphicsOptout() {
        return cy.get("#edit-optouts label").eq(0);
    }

    get audioOptout() {
        return cy.get("#edit-optouts label").eq(1);
    }

    get linkLabelFields() {
        return cy.get(".js-link-label");
    }

    get linkUrlFields() {
        return cy.get(".js-link-url");
    }

    get linkDeleteButtons() {
        return cy.get(".js-remove-link");
    }
    
    get addLinkButton() {
        return cy.get(".js-add-link");
    }

    get bodyEditor() {
        return site.getEditor();
    }

    get platformsSelect2Search() {
        return cy.get("select[name=platforms]");
    }

    get tagsSelect2Search() {
        return cy.get("select[name=tags]");
    }

    get highScoresOffRadio() {
        return cy.get("label[for=enable-high-score-off]");
    }

    get highScoresOnRadio() {
        return cy.get("label[for=enable-high-score-on]");
    }

    get highScoresInstructionsField() {
        return cy.get("textarea[name=high-score-instructions]");
    }

    get entryDeleteButton() {
        return cy.get(".btn-danger");
    }

    get saveButton() {
        return cy.get("input[type=submit]");
    }

}

export default new EntryEditPO();
