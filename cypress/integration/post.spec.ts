import { ADMIN_POST_WITHOUT_COMMENTS, USER_DUMBLEDORE } from "../support/data";
import po from "../support/page-objects";

const post = po.post;
const postEdit = po.postEdit;
const myPosts = po.dashboard.posts;

function commentCountersShouldContain(value: string) {
  post.commentCounter.should("contain", value);
  post.commentSectionTitle.should("contain", value);
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
    myPosts.visit();
    myPosts.createPostButton.click();

    postEdit.titleInput.type("I'm in");
    postEdit.editor.typeInEditor("Let's make games!");
    postEdit.publishButton.click();

    post.postTitle.should("contain", "I'm in");
    post.postBody.should("contain", "Let's make games!");

    post.postEditButton.click();
    postEdit.titleInput.clear().type("Hacked");
    postEdit.editor.clearEditor().typeInEditor("Hacked my own post");
    postEdit.saveButton.click();

    post.postTitle.should("contain", "Hacked");
    post.postBody.should("contain", "Hacked my own post");

    post.postEditButton.click();
    postEdit.deleteButton.click();
  });

  it("supports creating, editing and deleting comments", () => {
    post.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    post.writeNewComment("Hello world!");
    post.comments.should("contain", "Hello world!");

    post.commentEditButton.click();
    post.commentEditor.clearEditor().typeInEditor("Goodbye world!");
    post.commentSaveButton.click();
    post.comments.should("not.contain", "Hello world!");
    post.comments.should("contain", "Goodbye world!");

    post.commentEditButton.click();
    post.commentDeleteButton.click();
    post.comments.should("not.contain", "Goodbye world!");
  });

  it("increments counters when creating a comment", () => {
    post.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    commentCountersShouldContain("0");
    post.writeNewComment("Hello world!");
    commentCountersShouldContain("1");
  });

  it("support liking and unliking", () => {
    post.visit({ postId: ADMIN_POST_WITHOUT_COMMENTS });

    post.likeCounter.should("contain", "0");
    post.likeButton.click();
    post.likeCounter.should("contain", "1");
    post.likeButton.click();
    post.likeCounter.should("contain", "0");
  });

});
