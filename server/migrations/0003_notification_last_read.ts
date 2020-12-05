/**
 * Feedback score
 */

exports.up = (knex) => {
  return knex.schema.table("user", (table) => {
    table.dateTime("notifications_last_read");
  });
};

exports.down = (knex) => {
  return knex.schema.table("user", (table) => {
    table.dropColumn("notifications_last_read");
  });
};
