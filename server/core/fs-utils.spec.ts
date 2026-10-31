import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyDirectory } from "./fs-utils";

describe("emptyDirectory", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "alakajam-empty-dir-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("removes files but keeps the directory and its subdirectories", async () => {
    fs.writeFileSync(path.join(dir, "a.png"), "a");
    fs.writeFileSync(path.join(dir, "b-c.gif"), "b");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "keep.txt"), "k");

    const result = await emptyDirectory(dir);

    expect(result).toEqual({ removed: 2, failed: 0 });
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.existsSync(path.join(dir, "a.png"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "b-c.gif"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "sub", "keep.txt"))).toBe(true);
  });

  it("leaves files matched by the keep predicate", async () => {
    fs.writeFileSync(path.join(dir, "upload"), "u");
    fs.writeFileSync(path.join(dir, "unit-test.sqlite"), "db");

    const result = await emptyDirectory(dir, (name) => name.endsWith(".sqlite"));

    expect(result).toEqual({ removed: 1, failed: 0 });
    expect(fs.existsSync(path.join(dir, "unit-test.sqlite"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "upload"))).toBe(false);
  });

  it("tolerates a missing directory", async () => {
    const result = await emptyDirectory(path.join(dir, "does-not-exist"));
    expect(result).toEqual({ removed: 0, failed: 0 });
  });
});
