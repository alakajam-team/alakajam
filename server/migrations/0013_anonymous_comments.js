exports.up = async function(knex, Promise) {
  await knex.schema.table("entry", function(table) {
    table.boolean("allow_anonymous");
  });

  await knex.schema.table("user", function(table) {
    table.boolean("disallow_anonymous");
  });

  await knex("user").insert({
    "id": -1,
    "name": "anonymous", // Whatever, just make sure it's not taken by an existing user
    "title": "Anonymous",
    "email": "",
    "avatar": null,
    "is_mod": null,
    "is_admin": null,
    "password": "xxx",
    "password_salt": "xxx",
    "disallow_anonymous": false,
  });

  await knex("user_details").insert({
    "id": -1,
    "user_id": -1,
    "body": "Anonymous User",
    "social_links": "",
  });

  await knex.schema.createTable("anonymous_comment_user", function(table) {
    table.integer("comment_id");
    table.integer("user_id");
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable("anonymous_comment_user");

  await knex("user_details")
    .where({ "id": -1,
      "user_id": -1 })
    .del();

  await knex("user")
    .where({ "id": -1,
      "name": "anonymous" })
    .del();

  await knex.schema.table("user", function(table) {
    table.dropColumn("disallow_anonymous");
  });

  await knex.schema.table("entry", function(table) {
    table.dropColumn("allow_anonymous");
  });
};
