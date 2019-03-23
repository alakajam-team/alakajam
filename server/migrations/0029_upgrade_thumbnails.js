const promisify = require("promisify-node");
const fs = promisify("fs");
const path = promisify("path");

const log = require("../core/log").default;
const models = require("../core/models").default;
const eventService = require("../services/event-service").default;

exports.up = async function(knex, Promise) {
  try {
    let entries = await models.Entry.where({}).orderBy("id", "ASC").fetchAll();
    log.info("Generate Thumbnails for " + entries.length + " entries.");
    let i = 0;
    let u = 0;
    for (const entry of entries.models) {
      try {
        i++;
        if (entry.picturePreviews().length > 0) {
          u++;
          let movedFile = path.join(__dirname, "..", entry.picturePreviews()[0].replace(".", "-old."));
          await fs.rename(path.join(__dirname, "..", entry.picturePreviews()[0]), movedFile);
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
