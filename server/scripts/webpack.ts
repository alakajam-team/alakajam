/* eslint-disable @typescript-eslint/no-var-requires */

import * as findUp from "find-up";
import { intersection } from "lodash";
import * as path from "path";
import fileStorage from "../core/file-storage";
import log from "../core/log";

const ROOT_PATH = path.dirname(findUp.sync("package.json", { cwd: __dirname }));

class WebpackBuilder {

  public async initialize({watch = false}): Promise<void> {
    const webpack = require("webpack");

    const env = process.env.NODE_ENV || "development";
    const webpackConfig = require(path.join(ROOT_PATH, "./webpack." + env + ".js"));

    await fileStorage.createFolderIfMissing(webpackConfig.output.path);

    const compiler = webpack(webpackConfig);

    await new Promise((resolve) => {
      function callback(err, stats) {
        // https://webpack.js.org/api/node/#error-handling

        if (err) {
          // This means an error in webpack or its configuration, not an error in
          // the compiled sources.
          log.error(err.stack || err);
          if (err.details) {
            log.error(err.details);
          }
          return;
        }

        let logMethod = log.info.bind(log);
        if (stats.hasErrors()) {
          logMethod = log.error.bind(log);
        } else if (stats.hasWarnings()) {
          logMethod = log.warn.bind(log);
        }
        logMethod(stats.toString(webpackConfig.stats));

        resolve(undefined);
      }

      if (watch) {
        log.info("Setting up automatic JS build...");
        compiler.watch(webpackConfig.watchOptions || {}, callback);
      } else {
        log.info("Building JS...");
        compiler.run(callback);
      }
    });
  }

}

const instance = new WebpackBuilder();
export default instance;

// Standalone execution
if (path.resolve(process.argv[1]) === path.resolve(__filename)) {
  instance.initialize({ watch: intersection(process.argv, ["-w", "--watch"]).length > 0 })
    .catch(e => log.error(e));
}
