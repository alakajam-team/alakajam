import { describe, expect, it } from "vitest";
import links from "./links";

describe("links.isLocalPath()", () => {
  it("allows local paths", () => {
    for (const target of ["/", "/user/foo?bar=1#baz"]) {
      expect(links.isLocalPath(target)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const target of ["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "javascript:alert(1)", ".", "?x=1", ""]) {
      expect(links.isLocalPath(target)).toBe(false);
    }
  });
});
