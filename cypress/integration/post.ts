import { USER_ADMINISTRATOR } from "../support/data";
import * as site from "../support/page-objects";

describe("Posts", () => {

  before(() => {
    cy.backupDB();
    cy.loginAs(USER_ADMINISTRATOR);
  });

  afterEach(() => {
    cy.restoreDB();
  });

  it("support writing comments", () => {
    const postPage = site.post;
    
    postPage.visit(3);
    postPage.commentsTitle.should("contain", "(0)");
    postPage.editor.type("Hello world!", { force: true });
    postPage.commentSaveButton.click();
    postPage.commentsTitle.should("contain", "(1)");
    postPage.comments.should("contain", "Hello world!");
  });

});
