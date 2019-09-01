const promisify = require("promisify-node");
const fs = promisify("fs");
const path = promisify("path");

require("module-alias/register");
const config = require("server/core/config").default;
const constants = require("server/core/constants").default;
const log = require("server/core/log").default;
const models = require("server/core/models");
const eventService = require("server/event/event.service").default;

exports.up = async function(knex, Promise) {
  try {
    let entries
    if (config.DB_TYPE === "sqlite3") {
      entries = [] // Bookshelf unsupported due to having a single connection
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
          let movedFile = path.join(constants.ROOT_PATH, entry.picturePreviews()[0].replace(".", "-old."));
          await fs.rename(path.join(constants.ROOT_PATH, entry.picturePreviews()[0]), movedFile);
          await eventService.setEntryPicture(entry, movedFile);
          await entry.save();
          await fs.unlink(movedFile);
        }
        log.info(i + "/" + entries.length);
      } catch (e) {
        log.error("Failed to generate thumbnails for entry " + entry.get("name") + ", picture: " + entry.picturePreviews()[0], e);
      }
    }
    log.info("Generated Thumbnails: " + u);

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    // Nothing to do
    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
