/**
 * Like system for posts
 */

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.createTableIfNotExists("like", function(table) {
      table.increments("id").primary();
      table.string("type").notNullable();
      table.integer("user_id").references("user.id").notNullable();
      table.integer("node_id").notNullable();
      table.string("node_type").notNullable();
      table.index(["node_id", "node_type"]);
      table.timestamps();
    });
    await knex.schema.table("post", function(table) {
      table.integer("like_count").notNullable().defaultTo(0);
      table.string("like_details", 500).notNullable().defaultTo("[]");
    });
    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.dropTableIfExists("like");
    await knex.schema.table("post", function(table) {
      table.dropColumn("like_count");
      table.dropColumn("like_details");
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
