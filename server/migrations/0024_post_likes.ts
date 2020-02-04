/**
 * Like system for posts
 */

exports.up = async (knex) => {
  await knex.schema.createTable("like", (table) => {
    table.increments("id").primary();
    table.string("type").notNullable();
    table.integer("user_id").references("user.id").notNullable();
    table.integer("node_id").notNullable();
    table.string("node_type").notNullable();
    table.index(["node_id", "node_type"]);
    table.timestamps();
  });
  await knex.schema.table("post", (table) => {
    table.integer("like_count").notNullable().defaultTo(0);
    table.string("like_details", 500).notNullable().defaultTo("[]");
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("like");
  await knex.schema.table("post", (table) => {
    table.dropColumn("like_count");
    table.dropColumn("like_details");
  });
};
