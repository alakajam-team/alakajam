import * as chokidar from "chokidar";
import copy from "copy";
import * as findUp from "find-up";
import { writeFileSync } from "fs";
import { copySync } from "fs-extra";
import { debounce, intersection } from "lodash";
import * as path from "path";
import * as sass from "sass";
import fileStorage from "../core/file-storage";
import log from "../core/log";

class SassBuilder {

  private readonly ROOT_PATH = path.dirname(findUp.sync("package.json", { cwd: __dirname }));
  private readonly CLIENT_SRC_FOLDER = path.join(this.ROOT_PATH, "./client/");
  private readonly CLIENT_DEST_FOLDER = path.join(this.ROOT_PATH, "./dist/client/");
  private readonly ASSETS_GLOBS = ["png", "gif", "svg", "ttf", "woff", "woff2", "eot"].map((ext) => "./**/*." + ext);
  private readonly FA_WEBFONTS_FOLDER = path.join(this.ROOT_PATH, "./node_modules/@fortawesome/fontawesome-free/webfonts/");

  public async initialize({ watch = false }): Promise<[sass.CompileResult, string[]] | undefined> {
    this.copyWebfonts();

    if (!watch) {
      log.info("Building SASS...");

      const { resolve: sassResolve, reject: sassReject, promise: sassPromise }
        = this.createDeferredPromise<sass.CompileResult>();
      const { resolve: assetsResolve, reject: assetsReject, promise: assetsPromise }
        = this.createDeferredPromise<string[]>();

      this.sassBuild(sassResolve, sassReject)
        .catch(e => log.error(e));
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
      assetWatcher.on("all", (_eventName: string, assetPath: string) => {
        this.copyAssets({
          assetsPath: assetPath,
          resolve: () => { log.debug(`Copied ${assetPath}`); }
        });
      });
    }
  }

  private copyWebfonts() {
    const WEBFONTS_PATH = "webfonts"; // the Font Awesome CSS needs this exact path
    copySync(this.FA_WEBFONTS_FOLDER, path.join(this.CLIENT_DEST_FOLDER, WEBFONTS_PATH));
    log.debug(`Copied ${WEBFONTS_PATH}`);
  }

  private async sassBuild(resolve?: (result: sass.CompileResult) => void, reject?: (cause?: any) => void) {
    await fileStorage.createFolderIfMissing(path.resolve(this.CLIENT_DEST_FOLDER, "css"))
      .catch(reject);
    const inputFile = path.resolve(this.CLIENT_SRC_FOLDER, "scss/index.scss");
    const outputFile = path.resolve(this.CLIENT_DEST_FOLDER, "css/index.css");

    try {
      const result = sass.compile(inputFile, {
        sourceMap: false,
        quietDeps: true,
        loadPaths: [this.ROOT_PATH, path.resolve(this.CLIENT_SRC_FOLDER, "css")]
      });

      writeFileSync(outputFile, result.css)
      log.info(`Built CSS to ${outputFile} (${result.css.length / 1000.}kb)`);
      if (typeof resolve === "function") { resolve(result); }
    } catch (error) {
      log.error(error.message, error.stack);
      if (typeof reject === "function") { reject(error); }
    }
  }

  private copyAssets({ assetsPath, reject, resolve }:
    {
      assetsPath?: string | string[];
      reject?: (reason: any) => void;
      resolve?: (files: string[]) => void;
    }) {
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
  instance.initialize({ watch: intersection(process.argv, ["-w", "--watch"]).length > 0 })
    .catch((e) => {
      log.error(e);
      process.exit(1);
    });
}
