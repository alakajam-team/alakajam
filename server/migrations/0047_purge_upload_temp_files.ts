/**
 * Empties the upload temp folder once, to purge files leaked by picture uploads (see issue #602).
 * Only files directly inside the temp folder are removed. Failures are logged, never thrown.
 */

import Knex from "knex";
import * as configUtils from "server/core/config";
import { emptyDirectory } from "server/core/fs-utils";
import log from "server/core/log";

// The unit tests' SQLite database lives in the same folder: it must survive the purge
const isDatabaseFile = (fileName: string) => /\.sqlite/.test(fileName);

exports.up = async (knex: Knex) => {
  const tmpPath = configUtils.tmpPathAbsolute();
  try {
    const { removed, failed } = await emptyDirectory(tmpPath, isDatabaseFile);
    log.info(`Purged ${removed} leaked upload temp file(s) from ${tmpPath}` + (failed ? ` (${failed} could not be removed)` : ""));
  } catch (e) {
    log.error("Could not purge upload temp folder " + tmpPath, e);
  }
};

exports.down = async (knex: Knex) => {
  // Nothing to restore
};
