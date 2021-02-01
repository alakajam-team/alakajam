if (__filename.endsWith(".js")) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}

import { BookshelfCollectionOf, EntryBookshelfModel } from "bookshelf";
import * as fs from "fs-extra";
import * as path from "path";
import config from "server/core/config";
import constants from "server/core/constants";
import log from "server/core/log";
import * as models from "server/core/models";
import entryPicturesService from "server/entry/entry-pictures.service";


exports.up = async (_knex) => {
  let entries: BookshelfCollectionOf<EntryBookshelfModel>;
  if (config.DB_TYPE === "postgresql") { // SQLite unsupported due to having a single connection
    try {
      entries = await models.Entry.where({}).orderBy("id", "ASC").fetchAll() as BookshelfCollectionOf<EntryBookshelfModel>;
    } catch (e) {
      log.debug("Failed to fetch entry list to update thumbnails, assuming this is a fresh database.");
    }
  }

  if (!entries) {
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
        await entryPicturesService.setEntryPicture(entry, movedFile);
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

exports.down = async (_knex) => {
  // Nothing to do
};
