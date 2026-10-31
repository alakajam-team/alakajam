import { describe, it } from "vitest";
import { expect } from "chai";
import forms from "./forms";

describe("Forms", () => {

  describe("isUsername", () => {

    it("should accept usernames within the length limits", () => {
      expect(forms.isUsername("abc")).to.equal(true);
      expect(forms.isUsername("a".repeat(32))).to.equal(true);
    });

    it("should reject too short or too long usernames", () => {
      expect(forms.isUsername("ab")).to.equal(false);
      expect(forms.isUsername("a".repeat(33))).to.equal(false);
    });

    it("should reject invalid characters", () => {
      expect(forms.isUsername("1abc")).to.equal(false);
      expect(forms.isUsername("ab cd")).to.equal(false);
    });

  });

  describe("markdownToHtml", () => {

    it("should support read more links", () => {
      const shortened = forms.markdownToHtml("This is a test of a long text that should be shortened.", { maxLength: 10, readMoreLink: "/test" });

      expect(shortened).to.equal("<p>This is a ... <a href=\"/test\">(read more)</a></p>");
    });

  });

});
