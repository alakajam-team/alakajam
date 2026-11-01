import express from "express";
import { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireDigits, skipRouteUnless } from "./route-guards";

/**
 * Pins down the Express 5 path syntax used by server/routes.ts
 */
describe("Route guards & Express 5 path syntax", () => {
  let server: ReturnType<express.Application["listen"]>;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    const router = express.Router();
    app.use(router);

    router.param("eventName", skipRouteUnless((value) => value.includes("-")));
    router.param("entryId", skipRouteUnless((value) => /^\d+$/.test(value)));

    router.use("/:eventName/:entryId{/:entryName}{/*rest}", (req, res, next) => {
      res.setHeader("x-entry-mw", JSON.stringify(req.params));
      next();
    });
    router.use("/:eventName", (req, res, next) => {
      res.setHeader("x-event-mw", req.params.eventName);
      next();
    });
    router.get("/", (_req, res) => res.send("home"));
    router.get("/dashboard{/feed}", (_req, res) => res.send("dashboard"));
    router.get("/post{s}", (_req, res) => res.send("posts"));
    router.get("/post/create", (_req, res) => res.send("create"));
    router.get("/post/:postId", (req, res) => res.send("any post " + req.params.postId));
    router.get("/post/:postId{/:postName}", requireDigits("postId"), (req, res) => res.send("numeric post " + req.params.postId));
    router.get("/:eventName", (req, res) => res.send("event " + req.params.eventName));
    router.get("/:eventName/:entryId{/:entryName}", (req, res) => res.send(`entry ${req.params.entryId} ${req.params.entryName}`));
    router.get("/:eventName/:entryId/:entryName/edit", (_req, res) => res.send("edit"));
    router.get("/{*any}", () => Promise.reject(new Error("async failure")));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).send("handled: " + err.message);
    });

    await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => { server.close(); });

  async function get(path: string) {
    const res = await fetch(baseUrl + path);
    return { status: res.status, body: await res.text(), headers: res.headers };
  }

  it("only matches event names containing a dash", async () => {
    expect((await get("/some-event")).body).toBe("event some-event");
    expect((await get("/some-event")).headers.get("x-event-mw")).toBe("some-event");
    expect((await get("/nodash")).body).toContain("handled"); // falls through to the catch-all
    expect((await get("/nodash")).headers.get("x-event-mw")).toBeNull();
  });

  it("only matches numeric entry ids, with an optional entry name", async () => {
    expect((await get("/some-event/12")).body).toBe("entry 12 undefined");
    expect((await get("/some-event/12/my-game")).body).toBe("entry 12 my-game");
    expect((await get("/some-event/12/my-game/edit")).body).toBe("edit");
    expect((await get("/some-event/abc/my-game")).body).toContain("handled");
  });

  it("exposes the trailing wildcard of the entry middleware as an array", async () => {
    const params = JSON.parse((await get("/some-event/12/my-game/scores/page")).headers.get("x-entry-mw")!);
    expect(params).toEqual({ eventName: "some-event", entryId: "12", entryName: "my-game", rest: ["scores", "page"] });
  });

  it("supports optional path segments", async () => {
    expect((await get("/dashboard")).body).toBe("dashboard");
    expect((await get("/dashboard/feed")).body).toBe("dashboard");
    expect((await get("/post")).body).toBe("posts");
    expect((await get("/posts")).body).toBe("posts");
  });

  it("only applies numeric guards on the routes that need them", async () => {
    expect((await get("/post/create")).body).toBe("create");
    expect((await get("/post/12")).body).toBe("any post 12");
    expect((await get("/post/12/my-post")).body).toBe("numeric post 12");
    expect((await get("/post/abc/my-post")).body).toContain("handled");
  });

  it("routes rejected promises to the error handler without a promise-aware router", async () => {
    const res = await get("/other/thing");
    expect(res.status).toBe(500);
    expect(res.body).toBe("handled: async failure");
  });
});
