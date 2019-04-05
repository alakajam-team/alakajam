/**
 * Move uploads to data/ folder
 */

const fs = require("fs")
const path = require("path")
const constants = require("server/core/constants").default;

const STATIC_UPLOADS = path.join(constants.ROOT_PATH, "static/uploads");
const DATA_UPLOADS = path.join(constants.ROOT_PATH, "data/uploads");

exports.up = async function(knex, Promise) {
  try {
    fs.renameSync(STATIC_UPLOADS, DATA_UPLOADS)

    await knex('event').update('logo', knex.raw("replace(logo, '/static/uploads', '/data/uploads')"))
    await knex('event_details').update('banner', knex.raw("replace(banner, '/static/uploads', '/data/uploads')"))
    await knex('entry').update('pictures', knex.raw("replace(pictures, '/static/uploads', '/data/uploads')"))
    await knex('entry_score').update('proof', knex.raw("replace(proof, '/static/uploads', '/data/uploads')"))
    await knex('user').update('avatar', knex.raw("replace(avatar, '/static/uploads', '/data/uploads')"))
    await knex('post').update('body', knex.raw("replace(body, '/static/uploads', '/data/uploads')"))
    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    fs.renameSync(DATA_UPLOADS, STATIC_UPLOADS)

    await knex('event').update('logo', knex.raw("replace(logo, '/data/uploads', '/static/uploads')"))
    await knex('event_details').update('banner', knex.raw("replace(banner, '/data/uploads', '/static/uploads')"))
    await knex('entry').update('pictures', knex.raw("replace(pictures, '/data/uploads', '/static/uploads')"))
    await knex('entry_score').update('proof', knex.raw("replace(proof, '/data/uploads', '/static/uploads')"))
    await knex('user').update('avatar', knex.raw("replace(avatar, '/data/uploads', '/static/uploads')"))
    await knex('post').update('body', knex.raw("replace(body, '/data/uploads', '/static/uploads')"))

    Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};
