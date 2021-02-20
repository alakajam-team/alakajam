/* eslint-disable no-console */

import * as childProcess from "child_process";
import * as path from "path";
import constants from "../core/constants";
import config, { Config } from "../core/config";
import { Mutable } from "server/types";

const editableConfig: Mutable<Config> = config as any;
editableConfig.DEBUG_DISABLE_CACHE = false;
editableConfig.DB_TYPE = "sqlite3";
editableConfig.DB_SQLITE_FILENAME = "data/test.sqlite";

const specMatcher = process.argv.length >= 3
  ? "server/**/" + process.argv[2] + "*"
  : "server/**/*.spec.ts";

const mochaExec = process.platform.startsWith("win") ? "mocha.cmd" : "mocha";
const mochaPath = path.resolve(constants.ROOT_PATH, "node_modules/.bin", mochaExec);
const mochaArgs = [
  "-r ts-node/register/transpile-only",
  "-r tsconfig-paths/register",
  specMatcher,
  "--watch",
  "--watch-extensions ts",
  "--watch-files server"
];

console.log(`Running: mocha ${mochaArgs.join(" ")}`);

const cp = childProcess.spawn(mochaPath, mochaArgs, {
  cwd: constants.ROOT_PATH,
  stdio: "inherit",
  windowsVerbatimArguments: true,
  env: {
    CONFIG_PATH: "server/scripts/mocha-config.js"
  }
});

process.on("SIGINT", () => {
  console.log("Caught exit signal, closing mocha...");
  cp.kill("SIGTERM");
  process.exit();
});
