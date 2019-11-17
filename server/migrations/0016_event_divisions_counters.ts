import { createLuxonDate } from "server/core/formats";

/**
 * Event divisions map & entry counters
 */

exports.up = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.string("divisions", 2000).defaultTo("{}");
    table.integer("entry_count").defaultTo(0);
  });

  // Initialize divisions
  await knex("event")
    .update("divisions", JSON.stringify({
      solo: "48 hours<br />Everything from scratch",
      team: "48 hours<br />Everything from scratch",
      unranked: "72 hours<br />No rankings, just feedback",
    }));

  await knex.schema.table("event_details", (table) => {
    table.string("division_counts", 2000).defaultTo("{}");
  });

  // Initialize entry counts
  const rows = await knex("entry")
    .count()
    .select("division", "event_id")
    .whereNotNull("event_id")
    .where("published_at", "<=", createLuxonDate().toJSDate())
    .groupBy("division", "event_id");
  const countsByEvent = new Set();
  for (const row of rows) {
    const count = parseInt(row.count, 10);
    const division = row.division;
    const eventId = row.event_id;

    if (!countsByEvent[eventId]) {
      countsByEvent[eventId] = {
        eventId,
        total: 0,
        divisions: {},
      };
    }
    countsByEvent[eventId].total += count;
    countsByEvent[eventId].divisions[division] = count;
  }

  for (const eventId of Object.keys(countsByEvent)) {
    await knex("event")
      .update("entry_count", countsByEvent[eventId].total)
      .where("id", eventId);
    await knex("event_details")
      .update("division_counts", countsByEvent[eventId].divisions)
      .where("event_id", eventId);
  }
};

exports.down = async (knex) => {
  await knex.schema.table("event", (table) => {
    table.dropColumn("divisions");
    table.dropColumn("entry_count");
  });

  await knex.schema.table("event_details", (table) => {
    table.dropColumn("division_counts");
  });
};
