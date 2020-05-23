/**
 * Migrate entries to event participations
 */

import * as Knex from "knex";

exports.up = async (knex: Knex) => {
  const allEventRoles = await knex.select("event_id", "user_id")
    .from("user_role")
    .where("node_type", "entry")
    .whereNotNull("event_id")
    .whereNotNull("node_id");

  await knex.transaction(async (t) => {
    try {
      for (const eventRole of allEventRoles) {
        await knex("event_participation")
          .transacting(t)
          .insert({ ...eventRole });
      }
      await t.commit();
    } catch (e) {
      t.rollback();
      throw e;
    }
  });

  const eventParticipationCount = countParticipationsPerEvent(allEventRoles);
  for (const eventId of Object.keys(eventParticipationCount)) {
    const participationCount = eventParticipationCount[eventId];
    await knex("event_details")
      .where({ event_id: eventId })
      .update({ participation_count: participationCount });
  }
};

exports.down = async (knex: Knex) => {
  // Unsupported
};

function countParticipationsPerEvent(eventRoles: Array<{event_id: number; user_id: number}>) {
  const eventParticipationCount: Record<number, number> = {};
  for (const eventRole of eventRoles) {
    if (!eventParticipationCount[eventRole.event_id]) {
      eventParticipationCount[eventRole.event_id] = 1;
    } else {
      eventParticipationCount[eventRole.event_id]++;
    }
  }
  return eventParticipationCount;
}
