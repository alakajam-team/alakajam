/**
 * Allow tournaments on game jams
 */

exports.up = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.integer("tournament_count").defaultTo(0).notNullable();
  });
  await knex("event").update({ tournament_count: knex.ref("entry_count") }).where("status_tournament", "!=", "'disabled");

  const eventDetails = await knex.select().from("event_details");
  for (const details of eventDetails) {
    const flags = JSON.parse(details.flags);
    flags.hideStreamerMenu = flags.streamerOnlyTournament ? false : true;
    await knex("event_details").update({ flags: JSON.stringify(flags) }).where("id", "=", details.id);
  }
};

exports.down = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.dropColumn("tournament_count");
  });
};
