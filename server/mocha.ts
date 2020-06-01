/* eslint-disable no-console */

import * as childProcess from "child_process";
import constants from "./core/constants";

const specMatcher = process.argv.length >= 3
  ? "server/**/" + process.argv[2] + "*"
  : "server/**/*.spec.ts";

const npx = process.platform.startsWith("win") ? "npx.cmd" : "npx";
const npxArgs = [
  "mocha",
  "-r ts-node/register/transpile-only",
  "-r tsconfig-paths/register",
  specMatcher,
  "--watch",
  "--watch-extensions ts",
  "--watch-files server"
];

console.log(`Running: ${npx} ${npxArgs.join(" ")}`);

const cp = childProcess.spawn(npx, npxArgs, {
  cwd: constants.ROOT_PATH,
  stdio: "inherit"
});

process.on("SIGINT", () => {
  console.log("Caught exit signal, closing mocha...");
  cp.kill("SIGTERM");
  process.exit();
});
