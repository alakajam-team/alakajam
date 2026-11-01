import { describe, expect, it } from "vitest";
import slug from "./slug";

describe("slug", () => {
  it.each([
    ["Hello World", "hello-world"],
    ["  My Game: The Sequel!! ", "my-game-the-sequel"],
    ["Café Déjà-vu", "cafe-deja-vu"],
    ["a_b c", "ab-c"],
    ["docs/api", "docsapi"],
    ["Ünïcode ß", "unicode-ss"],
    ["x & y", "x-y"],
    ["--a--b--", "a-b"],
    ["Dev_Log 2", "devlog-2"],
    ["日本語", ""],
    ["", ""]
  ])("slugifies %j as %j", (input, expected) => {
    expect(slug(input)).toBe(expected);
  });

  it("is idempotent", () => {
    expect(slug(slug("Some  Title!"))).toBe("some-title");
  });
});
