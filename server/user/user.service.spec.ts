import { expect } from "chai";
import userService from "./user.service";

describe("User service", () => {

  it("should reject invalid usernames", async () => {
    const result = await userService.register("email@example.com", "xx", "password");

    expect(result).to.be.a("string");
    expect(result).to.contain("Username length must be at least");
  });

});
