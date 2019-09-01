/**
 * Feedback score
 */

exports.up = async (knex) => {
  return knex.schema.table("user", (table) => {
    table.dateTime("notifications_last_read");
  });
};

exports.down = async (knex) => {
  return knex.schema.table("user", (table) => {
    table.dropColumn("notifications_last_read");
  });
};
