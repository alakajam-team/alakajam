import * as chokidar from "chokidar";
import * as copy from "copy";
import * as findUp from "find-up";
import { writeFile } from "fs";
import { debounce, intersection } from "lodash";
import * as path from "path";
import * as sass from "sass";
import { promisify } from "util";
import fileStorage from "./core/file-storage";
import log from "./core/log";

class SassBuilder {

  private readonly ROOT_PATH = path.dirname(findUp.sync("package.json", { cwd: __dirname }));
  private readonly CLIENT_SRC_FOLDER = path.join(this.ROOT_PATH, "./client/");
  private readonly CLIENT_DEST_FOLDER = path.join(this.ROOT_PATH, "./dist/client/");
  private readonly ASSETS_GLOBS = ["png", "gif", "svg", "ttf", "woff", "woff2", "eot"]
    .map((ext) => "./**/*." + ext);

  private writeFileAsync = promisify(writeFile);

  public async initialize({ watch = false }): Promise<[sass.Result, string[]] | undefined> {
    if (!watch) {
      log.info("Building SASS...");

      const { resolve: sassResolve, reject: sassReject, promise: sassPromise }
        = this.createDeferredPromise<sass.Result>();
      const { resolve: assetsResolve, reject: assetsReject, promise: assetsPromise }
        = this.createDeferredPromise<string[]>();

      this.sassBuild(sassResolve, sassReject);
      this.copyAssets({
        assetsPath: this.ASSETS_GLOBS,
        reject: assetsReject,
        resolve: (files) => {
          log.info(`Copied ${files.length} static assets to ${this.CLIENT_DEST_FOLDER}`);
          assetsResolve();
        }
      });

      return Promise.all([sassPromise, assetsPromise]);

    } else {
      log.info("Setting up automatic SASS build...");
      const sassWatcher = chokidar.watch("**/*.scss", { cwd: this.CLIENT_SRC_FOLDER });
      sassWatcher.on("all", debounce(this.sassBuild.bind(this), 500));

      const assetWatcher = chokidar.watch(this.ASSETS_GLOBS, { cwd: this.CLIENT_SRC_FOLDER });
      assetWatcher.on("all", (eventName: string, assetPath: string) => {
        this.copyAssets({
          assetsPath: assetPath,
          resolve: () => { log.debug(`Copied ${assetPath}`); }
        });
      });
    }
  }

  private sassBuild(resolve?: (result: sass.Result) => void, reject?: (cause?: any) => void) {
    fileStorage.createFolderIfMissing(path.resolve(this.CLIENT_DEST_FOLDER, "css"));
    const inputFile = path.resolve(this.CLIENT_SRC_FOLDER, "scss/index.scss");
    const outputFile = path.resolve(this.CLIENT_DEST_FOLDER, "css/index.css");

    sass.render({
      file: inputFile,
      includePaths: [this.ROOT_PATH, path.resolve(this.CLIENT_SRC_FOLDER, "css")]
    }, async (error, result) => {
      if (error) {
        log.error(error.message, error.stack);
        if (typeof reject === "function") { reject(error); }
      } else {
        await this.writeFileAsync(outputFile, result.css);
        log.info(`Built CSS to ${outputFile} (${result.css.length / 1000.}kb)`);
        if (typeof resolve === "function") { resolve(result); }
      }
    });
  }

  private copyAssets({ assetsPath, reject, resolve }:
    { assetsPath?: string | string[], reject?: (reason: any) => void, resolve?: (files: string[]) => void }) {
    copy(
      assetsPath,
      this.CLIENT_DEST_FOLDER,
      { srcBase: this.CLIENT_SRC_FOLDER, cwd: this.CLIENT_SRC_FOLDER },
      (error: Error, files: any[]) => {
        if (error) {
          log.error(error.message, error.stack);
          if (typeof reject === "function") { reject(error); }
        } else {
          if (typeof resolve === "function") { resolve(files); }
        }
      });
  }

  private createDeferredPromise<T>() {
    let resolve: (value?: unknown) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((resolveFn, rejectFn) => {
      resolve = resolveFn;
      reject = rejectFn;
    });
    return { resolve, reject, promise };
  }

}

const instance = new SassBuilder();
export default instance;

// Standalone execution
if (path.resolve(process.argv[1]) === path.resolve(__filename)) {
  instance.initialize({ watch: intersection(process.argv, ["-w", "--watch"]).length > 0 });
}
