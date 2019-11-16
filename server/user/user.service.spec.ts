// tslint:disable: no-unused-expression

import { expect } from "chai";
import { closeTestDB, startTestDB } from "server/testing/testing-db";
import userService from "./user.service";

describe.only("User service", function() {
  this.timeout(10000);

  before(async () => {
    await startTestDB();
  });

  after(async () => {
    await closeTestDB();
  });

  describe("findByUser", () => {

    it("should return a user when searching a valid name", async () => {
      const result = await userService.findByName("administrator");

      expect(result).to.be.ok;
    });

  });

  describe("searchByName", () => {

    it("should find users when searching a valid query", async () => {
      const result = await userService.searchByName("%dministra%");

      expect(result.length).to.eq(1);
    });

  });

  describe("register", () => {

    it("should reject invalid usernames", async () => {
      const result = await userService.register("email@example.com", "xx", "password");

      expect(result).to.be.a("string");
      expect(result).to.contain("Username length must be at least");
    });

  });

});
