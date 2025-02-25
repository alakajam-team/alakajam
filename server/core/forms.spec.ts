import { expect } from "chai";
import forms from "./forms";

describe("Forms", () => {

  describe("markdownToHtml", () => {

    it("should support read more links", () => {
      const shortened = forms.markdownToHtml("This is a test of a long text that should be shortened.", { maxLength: 10, readMoreLink: "/test" });

      expect(shortened).to.equal("<p>This is a ... <a href=\"/test\">(read more)</a></p>");
    });

  });

});
