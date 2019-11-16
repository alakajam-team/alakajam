/**
 * Move uploads to data/ folder
 */

import * as fs from "fs-extra";
import * as Knex from "knex";
import * as path from "path";
import config from "server/core/config";
import constants from "server/core/constants";
import log from "server/core/log";

const STATIC_UPLOADS = path.join(constants.ROOT_PATH, "static/uploads");
const DATA_UPLOADS = path.join(path.resolve(constants.ROOT_PATH, config.DATA_PATH), "uploads");

exports.up = async (knex: Knex) => {
  await knex("event").update("logo", knex.raw("replace(logo, '/static/uploads', '/data/uploads')"));
  await knex("event_details").update("banner", knex.raw("replace(banner, '/static/uploads', '/data/uploads')"));
  await knex("entry").update("pictures", knex.raw("replace(pictures, '/static/uploads', '/data/uploads')"));
  await knex("entry_score").update("proof", knex.raw("replace(proof, '/static/uploads', '/data/uploads')"));
  await knex("user").update("avatar", knex.raw("replace(avatar, '/static/uploads', '/data/uploads')"));
  await knex("post").update("body", knex.raw("replace(body, '/static/uploads', '/data/uploads')"));

  try {
    await fs.rename(STATIC_UPLOADS, DATA_UPLOADS);
  } catch (e) {
    log.debug(`Failed to move uploads folder from ${STATIC_UPLOADS} to ${DATA_UPLOADS}`);
  }
};

exports.down = async (knex: Knex) => {
  try {
    await fs.rename(DATA_UPLOADS, STATIC_UPLOADS);
  } catch (e) {
    log.debug(`Failed to move uploads folder from ${DATA_UPLOADS} to ${STATIC_UPLOADS}`);
  }

  await knex("event").update("logo", knex.raw("replace(logo, '/data/uploads', '/static/uploads')"));
  await knex("event_details").update("banner", knex.raw("replace(banner, '/data/uploads', '/static/uploads')"));
  await knex("entry").update("pictures", knex.raw("replace(pictures, '/data/uploads', '/static/uploads')"));
  await knex("entry_score").update("proof", knex.raw("replace(proof, '/data/uploads', '/static/uploads')"));
  await knex("user").update("avatar", knex.raw("replace(avatar, '/data/uploads', '/static/uploads')"));
  await knex("post").update("body", knex.raw("replace(body, '/data/uploads', '/static/uploads')"));
};
