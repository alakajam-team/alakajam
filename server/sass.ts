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

class SassBuildService {

  private readonly ROOT_PATH = path.dirname(findUp.sync("package.json", { cwd: __dirname }));
  private readonly CLIENT_SRC_FOLDER = path.join(this.ROOT_PATH, "./client/");
  private readonly CLIENT_DEST_FOLDER = path.join(this.ROOT_PATH, "./dist/client/");
  private readonly ASSETS_GLOBS = ["png", "gif", "svg", "ttf", "woff", "woff2", "eot"]
    .map((ext) => "./**/*." + ext);

  private writeFileAsync = promisify(writeFile);

  public initialize({ watch = false }): void {
    if (watch) {
      log.info("Setting up automatic SASS build...");
      const sassWatcher = chokidar.watch("**/*.scss", { cwd: this.CLIENT_SRC_FOLDER });
      sassWatcher.on("all", debounce(this.sassBuild.bind(this), 500));

      const assetWatcher = chokidar.watch(this.ASSETS_GLOBS, { cwd: this.CLIENT_SRC_FOLDER });
      assetWatcher.on("all", (eventName: string, assetPath: string) => {
        this.copyAssets({
          assetsPath: assetPath,
          callback: () => { log.info(`Copied ${assetPath}`); }
        });
      });

    } else {
      log.info("Building SASS...");
      this.sassBuild();
      this.copyAssets({
        assetsPath: this.ASSETS_GLOBS,
        callback: (files) => {
          log.info(`Copied ${files.length} static assets to ${this.CLIENT_DEST_FOLDER}`);
        }
      });
    }
  }

  private sassBuild() {
    fileStorage.createFolderIfMissing(this.CLIENT_DEST_FOLDER);
    const inputFile = path.resolve(this.CLIENT_SRC_FOLDER, "scss/index.scss");
    const outputFile = path.resolve(this.CLIENT_DEST_FOLDER, "css/index.css");

    sass.render({
      file: inputFile,
      includePaths: [this.ROOT_PATH, path.resolve(this.CLIENT_SRC_FOLDER, "css")]
    }, async (error, result) => {
      if (error) {
        log.error(error.message, error.stack);
      } else {
        await this.writeFileAsync(outputFile, result.css);
        log.info(`Built CSS to ${outputFile} (${result.css.length / 1000.}kb)`);
      }
    });
  }

  private copyAssets({ assetsPath, callback }:
    { assetsPath?: string | string[], callback?: (files: any[]) => void }) {
    copy(
      assetsPath,
      this.CLIENT_DEST_FOLDER,
      { srcBase: this.CLIENT_SRC_FOLDER, cwd: this.CLIENT_SRC_FOLDER },
      (error: Error, files: any[]) => {
        if (error) {
          log.error(error.message, error.stack);
        } else {
          callback(files);
        }
      });
  }

}

const instance = new SassBuildService();
export default instance;

// Standalone execution
if (path.resolve(process.argv[1]) === path.resolve(__filename)) {
  instance.initialize({ watch: intersection(process.argv, ["-w", "--watch"]).length > 0 });
}
