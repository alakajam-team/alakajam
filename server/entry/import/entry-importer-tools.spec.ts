import { expect } from "chai";
import "module-alias/register";
import enums from "server/core/enums";
import { capitalizeAllWords, guessPlatforms } from "./entry-importer-tools";

describe("Entry importer tools", () => {

  describe("Guess platforms", () => {

    it("should guess platforms from keywords", () => {
      expect(guessPlatforms("this is a WEBGL game")).to.deep.eq([enums.PLATFORM.WEB]);
    });

  });

  describe("Capitalize all words", () => {

    it("should capitalize all words", () => {
      expect(capitalizeAllWords("this is a sentence")).to.eq("This Is A Sentence");
    });
  });

});
