import site from ".";

class PostPO {

    visit({ postId }: { postId: number | string }) {
        cy.visit(`/post/${postId}`);
    }

    writeNewComment(body: string) {
        this.commentEditor.type(body, { force: true });
        this.commentSaveButton.click();
    }

    // Header

    get postTitle() {
        return cy.get(".post__title");
    }

    get postEditButton() {
        return cy.get(".post .btn-default");
    }

    get commentCounter() {
        return cy.get(".post__comment-count");
    }
    
    get likeCounter() {
        return cy.get(".js-like-button");
    }

    get likeButton() {
        return this.likeCounter;
    }

    // Body

    get postBody() {
        return cy.get(".post__body");
    }

    // Comments

    get commentSectionTitle() {
        return cy.get("h2");
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

export default new PostPO();
