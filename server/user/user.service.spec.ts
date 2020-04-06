/* eslint-disable no-unused-expressions */

import { expect } from "chai";
import "module-alias/register";
import { closeTestDB, DB_TEST_TIMEOUT, startTestDB } from "server/testing/testing-db";
import userService from "./user.service";

describe("User service", function() {
  this.timeout(DB_TEST_TIMEOUT);

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

  describe("register", () => {

    it("should reject invalid usernames", async () => {
      const result = await userService.register("email@example.com", "xx", "password");

      expect(result).to.be.a("string");
      expect(result).to.contain("Username length must be at least");
    });

  });

});
