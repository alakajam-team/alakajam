class PostEditPO {

    public visit({ postId }: { postId: number | string }) {
        cy.visit(`/post/${postId}/edit`);
    }

    // Header

    get titlePreview() {
        return cy.get(".post__title");
    }

    // Body

    get titleInput() {
        return cy.get("input[name=title]");
    }

    get relatedEventDropdown() {
        return cy.get("select[name=event-id]");
    }

    get editor() {
        return cy.getEditor();
    }

    // Actions

    get publishButton() {
        return cy.get("input[name=publish]");
    }

    get saveButton() {
        return cy.get("input[name=save]").first();
    }

    get saveDraftButton() {
        return cy.get("input[name=save-draft]");
    }

    get unpublishButton() {
        return cy.get("input[name=unpublish]");
    }

    get deleteButton() {
        cy.acceptFutureConfirms();
        return cy.get(".btn-danger");
    }

    get scheduleButton() {
        return cy.get("input[value='Schedule...']");
    }

    get publishedAtField() {
        return cy.get("input[name=published-at]");
    }

    get saveScheduleButton() {
        return cy.get("input[name=save-custom]");
    }

}

export default new PostEditPO();
