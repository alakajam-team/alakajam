import { describe, expect, it } from "vitest";
import { isMenuLinkActive } from "./event-manage-menu.utils";

describe("isMenuLinkActive", () => {
  const url = "/event/1/edit-rankings";

  it("matches the exact path", () => {
    expect(isMenuLinkActive(url, url)).toBe(true);
  });

  it("ignores query string and hash", () => {
    expect(isMenuLinkActive(`${url}?division=all&categoryIndex=2`, url)).toBe(true);
    expect(isMenuLinkActive(`${url}#top`, url)).toBe(true);
  });

  it("does not match other pages", () => {
    expect(isMenuLinkActive("/event/1/edit-entries?x=1", url)).toBe(false);
    expect(isMenuLinkActive(`${url}-foo`, url)).toBe(false);
    expect(isMenuLinkActive(undefined, url)).toBe(false);
  });
});
