if (__filename.endsWith(".js")) {
  // tslint:disable-next-line: no-var-requires
  require("module-alias/register");
}

import * as fsNative from "fs";
import * as pathNative from "path";
import * as promisify from "promisify-node";

import config from "server/core/config";
import constants from "server/core/constants";
import log from "server/core/log";
import * as models from "server/core/models";
import eventService from "server/event/event.service";

const fs = promisify(fsNative);
const path = promisify(pathNative);

exports.up = async (knex) => {
  let entries;
  if (config.DB_TYPE === "sqlite3") {
    entries = []; // Bookshelf unsupported due to having a single connection
  } else {
    entries = await models.Entry.where({}).orderBy("id", "ASC").fetchAll();
  }

  if (entries.length === 0) {
    return;
  }

  log.info("Generate Thumbnails for " + entries.length + " entries.");
  let i = 0;
  let u = 0;
  for (const entry of entries.models) {
    try {
      i++;
      if (entry.picturePreviews().length > 0) {
        u++;
        const movedFile = path.join(constants.ROOT_PATH, entry.picturePreviews()[0].replace(".", "-old."));
        await fs.rename(path.join(constants.ROOT_PATH, entry.picturePreviews()[0]), movedFile);
        await eventService.setEntryPicture(entry, movedFile);
        await entry.save();
        await fs.unlink(movedFile);
      }
      log.info(i + "/" + entries.length);
    } catch (e) {
      log.error("Failed to generate thumbnails for entry "
        + entry.get("name") + ", picture: " + entry.picturePreviews()[0], e);
    }
  }
  log.info("Generated Thumbnails: " + u);
};

exports.down = async (knex) => {
  // Nothing to do
};
