/**
 * Event divisions map & entry counters
 */

exports.up = async function(knex, Promise) {
  try {
    await knex.schema.table("event", function(table) {
      table.string("divisions", 2000).defaultTo("{}");
      table.integer("entry_count").defaultTo(0);
    });

    // Initialize divisions
    await knex("event")
      .update("divisions", JSON.stringify({
        "solo": "48 hours<br />Everything from scratch",
        "team": "48 hours<br />Everything from scratch",
        "unranked": "72 hours<br />No rankings, just feedback",
      }));

    await knex.schema.table("event_details", function(table) {
      table.string("division_counts", 2000).defaultTo("{}");
    });

    // Initialize entry counts
    let rows = await knex("entry")
      .count()
      .select("division", "event_id")
      .whereNotNull("event_id")
      .where("published_at", "<=", new Date())
      .groupBy("division", "event_id");
    let countsByEvent = {};
    for (let row of rows) {
      let count = parseInt(row.count);
      let division = row.division;
      let eventId = row.event_id;

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
    for (let eventId in countsByEvent) {
      await knex("event")
        .update("entry_count", countsByEvent[eventId].total)
        .where("id", eventId);
      await knex("event_details")
        .update("division_counts", countsByEvent[eventId].divisions)
        .where("event_id", eventId);
    }

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};

exports.down = async function(knex, Promise) {
  try {
    await knex.schema.table("event", function(table) {
      table.dropColumn("divisions");
      table.dropColumn("entry_count");
    });

    await knex.schema.table("event_details", function(table) {
      table.dropColumn("division_counts");
    });

    Promise.resolve();
  } catch (e) {
    console.log(e.message);
    Promise.reject(e);
  }
};
