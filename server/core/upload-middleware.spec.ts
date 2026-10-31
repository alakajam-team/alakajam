import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { describe, expect, it } from "vitest";
import * as configUtils from "server/core/config";
import { initUploadMiddleware } from "./upload-middleware";

describe("upload middleware temp files (#602)", () => {
  it("removes the temp file when the response closes", async () => {
    fs.mkdirSync(configUtils.tmpPathAbsolute(), { recursive: true });
    const storage = (initUploadMiddleware() as any).storage;
    const res = new EventEmitter();
    const req = { res } as any;
    const file = { originalname: "pic.png", stream: Readable.from(["data"]) } as any;

    const info: any = await new Promise((resolve, reject) =>
      storage._handleFile(req, file, (err: Error, i: any) => err ? reject(err) : resolve(i)));
    const tempPath = path.join(configUtils.tmpPathAbsolute(), info.filename);
    expect(fs.existsSync(tempPath)).toBe(true);

    res.emit("close");
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.existsSync(tempPath)).toBe(false);
  });
});
