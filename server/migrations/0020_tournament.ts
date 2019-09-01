/**
 * Support for high scores & tournaments
 */

exports.up = async (knex) => {
  await knex.schema.createTable("entry_score", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("user.id").notNullable();
    table.integer("entry_id").references("entry.id").notNullable();
    table.decimal("score", 15, 3).notNullable();
    table.string("proof");
    table.integer("ranking");
    table.boolean("active").defaultTo(true);
    table.timestamps();
  });

  await knex.schema.createTable("tournament_entry", (table) => {
    table.increments("id").primary();
    table.integer("event_id").references("event.id").notNullable(); // NB. Usually not the same event as the entry's!
    table.integer("entry_id").references("entry.id").notNullable();
    table.integer("ordering").defaultTo(0);
    table.boolean("active").defaultTo(false);
    table.timestamps();
  });

  await knex.schema.createTable("tournament_score", (table) => {
    table.increments("id").primary();
    table.integer("event_id").references("event.id").notNullable();
    table.integer("user_id").references("user.id").notNullable();
    table.decimal("score", 15, 3).defaultTo(0).notNullable();
    table.string("entry_scores", 1000);
    table.integer("ranking");
    table.timestamps();
  });

  await knex.schema.table("entry", (table) => {
    table.string("status_high_score").defaultTo("off");
  });

  await knex.schema.table("entry_details", (table) => {
    table.integer("high_score_count");
    table.string("high_score_type", 20);
    table.string("high_score_instructions", 2000);
  });

  await knex.schema.table("event", (table) => {
    table.string("status_tournament").defaultTo("disabled");
  });
};

exports.down = async (knex) => {
  for (const table of ["entry_score", "tournament_entry", "tournament_score"]) {
    await knex.schema.dropTableIfExists(table);
  }

  await knex.schema.table("entry", (table) => {
    table.dropColumn("status_high_score");
  });

  await knex.schema.table("entry_details", (table) => {
    table.dropColumn("high_score_count");
    table.dropColumn("high_score_type");
    table.dropColumn("high_score_instructions");
  });

  await knex.schema.table("event", (table) => {
    table.dropColumn("status_tournament");
  });
};
