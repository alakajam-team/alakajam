import { getEditor } from ".";

class PostPO {

    visit(postId: number | string) {
        cy.visit(`/post/${postId}`);
    }

    get commentsTitle() {
        return cy.get("h2");
    }

    get commentSaveButton() {
        return cy.get("input[name=save]");
    }

    get comments() {
        return cy.get(".comment");
    }

    get editor() {
        return getEditor();
    }

}

export default new PostPO();
