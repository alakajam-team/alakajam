/**
 * Development-only live reload.
 *
 * Watches the client build output (`dist/client`) and notifies connected browsers through
 * Server-Sent Events on `GET /__livereload`:
 * - `boot`: sent on connection, with an ID unique to this server process. Browsers reload the page
 *   when they reconnect to a server with a different boot ID (i.e. the server was restarted).
 * - `css`: only stylesheets changed, browsers hot-swap them without reloading the page.
 * - `reload`: any other client file changed, browsers reload the page.
 */

import * as chokidar from "chokidar";
import * as crypto from "crypto";
import { Request, Response } from "express";
import * as path from "path";
import * as configUtils from "./config";
import log from "./log";

export const LIVE_RELOAD_PATH = "/__livereload";

const BATCH_DELAY_MS = 150;
const HEARTBEAT_INTERVAL_MS = 30000;

type LiveReloadEvent = "boot" | "css" | "reload";

export class LiveReload {

  private readonly bootId = crypto.randomBytes(8).toString("hex");
  private readonly clients = new Set<Response>();
  private changedFiles: string[] = [];
  private batchTimeout?: NodeJS.Timeout;

  /**
   * Starts watching the client build output.
   */
  public watch(folderPath = configUtils.clientBuildPathAbsolute()): void {
    log.info(`Live reload enabled, watching ${folderPath}`);
    chokidar.watch(folderPath, { ignoreInitial: true })
      .on("add", (filePath) => this.onFileChanged(filePath))
      .on("change", (filePath) => this.onFileChanged(filePath))
      .on("unlink", (filePath) => this.onFileChanged(filePath));
  }

  /**
   * Express handler for the Server-Sent Events endpoint.
   */
  public handler = (req: Request, res: Response): void => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write("retry: 1000\n\n");
    this.send(res, "boot", this.bootId);
    this.clients.add(res);

    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), HEARTBEAT_INTERVAL_MS);
    req.on("close", () => {
      clearInterval(heartbeat);
      this.clients.delete(res);
    });
  };

  private onFileChanged(filePath: string): void {
    this.changedFiles.push(filePath);
    clearTimeout(this.batchTimeout);
    this.batchTimeout = setTimeout(() => this.flushChanges(), BATCH_DELAY_MS);
  }

  private flushChanges(): void {
    const files = this.changedFiles;
    this.changedFiles = [];

    const event = files.every((filePath) => path.extname(filePath) === ".css") ? "css" : "reload";
    log.debug(`Live reload: ${event} (${files.length} file(s) changed)`);
    this.clients.forEach((client) => this.send(client, event));
  }

  private send(res: Response, event: LiveReloadEvent, data = ""): void {
    res.write(`event: ${event}\ndata: ${data}\n\n`);
  }

}

/**
 * Browser-side client, to be inlined in pages. Kept ES2019-compatible and dependency-free.
 */
export const LIVE_RELOAD_CLIENT_SCRIPT = `(function () {
  var bootId;
  var source = new EventSource("${LIVE_RELOAD_PATH}");
  source.addEventListener("boot", function (e) {
    if (bootId && bootId !== e.data) { location.reload(); }
    bootId = e.data;
  });
  source.addEventListener("reload", function () { location.reload(); });
  source.addEventListener("css", function () {
    document.querySelectorAll("link[rel=stylesheet]").forEach(function (link) {
      var url = new URL(link.href);
      if (url.pathname.indexOf("/dist/client/") === 0) {
        url.search = "?" + Date.now();
        link.href = url.toString();
      }
    });
  });
})();`;
