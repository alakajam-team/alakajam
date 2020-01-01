import { ADMIN_POST_WITHOUT_COMMENTS, USER_DUMBLEDORE } from "../support/data";
import postPo from "../support/page-objects/post.po";
import postEditPo from "../support/page-objects/post-edit.po";
import dashboardPo from "../support/page-objects/dashboard.po";

function commentCountersShouldContain(value: string) {
  postPo.commentCounter.should("contain", value);
  postPo.commentSectionTitle.should("contain", value);
}

describe("Post", () => {

  beforeEach(() => {
    cy.restoreDB();
    cy.loginAs(USER_DUMBLEDORE);
  });

  afterEach(() => {
    cy.restoreDB();
  });

  it("supports creation, edito and deletion", () => {
    dashboardPo.posts.visit();
    dashboardPo.posts.createPostButton.click();

    postEditPo.titleInput.type("I'm in");
    postEditPo.editor.typeInEditor("Let's make games!");
    postEditPo.publishButton.click();

    postPo.postTitle.should("contain", "I'm in");
    postPo.postBody.should("contain", "Let's make games!");

    postPo.postEditButton.click();
    postEditPo.titleInput.clear().type("Hacked");
    postEditPo.editor.clearEditor().typeInEditor("Hacked my own post");
    postEditPo.saveButton.click();

    postPo.postTitle.should("contain", "Hacked");
    postPo.postBody.should("contain", "Hacked my own post");

    postPo.postEditButton.click();
    postEditPo.deleteButton.click();
  });

  it("supports creating, editing and deleting comments", () => {
    postPo.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    postPo.writeNewComment("Hello world!");
    postPo.comments.should("contain", "Hello world!");

    postPo.commentEditButton.click();
    postPo.commentEditor.clearEditor().typeInEditor("Goodbye world!");
    postPo.commentSaveButton.click();
    postPo.comments.should("not.contain", "Hello world!");
    postPo.comments.should("contain", "Goodbye world!");

    postPo.commentEditButton.click();
    postPo.commentDeleteButton.click();
    postPo.comments.should("not.contain", "Goodbye world!");
  });

  it("increments counters when creating a comment", () => {
    postPo.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    commentCountersShouldContain("0");
    postPo.writeNewComment("Hello world!");
    commentCountersShouldContain("1");
  });

  it("support liking and unliking", () => {
    postPo.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    postPo.likeCounter.should("contain", "0");
    postPo.likeButton.click();
    postPo.likeCounter.should("contain", "1");
    postPo.likeButton.click();
    postPo.likeCounter.should("contain", "0");
  });

});
