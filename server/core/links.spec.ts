import { describe, expect, it } from "vitest";
import links from "./links";

describe("links.safeRedirectPath()", () => {
  it("allows local paths", () => {
    expect(links.safeRedirectPath("/")).toBe("/");
    expect(links.safeRedirectPath("/user/foo?bar=1#baz")).toBe("/user/foo?bar=1#baz");
  });

  it("rejects external and protocol-relative targets", () => {
    for (const target of ["https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "/\t/evil.com",
      "javascript:alert(1)", "evil.com", "", undefined, null, ["/a"]]) {
      expect(links.safeRedirectPath(target, "/fallback")).toBe("/fallback");
    }
  });
});
