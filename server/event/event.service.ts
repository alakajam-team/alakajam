import Bluebird from "bluebird";
import {
  BookshelfCollection,
  BookshelfModel,
  FetchAllOptions,
  SortOrder
} from "bookshelf";
import { range } from "lodash";
import cache from "server/core/cache";
import { ilikeOperator } from "server/core/config";
import constants from "server/core/constants";
import db from "server/core/db";
import enums from "server/core/enums";
import { createLuxonDate } from "server/core/formats";
import * as models from "server/core/models";
import { EventFlags } from "server/entity/event-details.entity";


/**
 * Service for managing events & entries.
 */
export class EventService {

  /**
   * Creates a new empty event
   * @param {EventTemplate} template An optional template to initialize the event with
   */
  public createEvent(template?: BookshelfModel): BookshelfModel {
    const event = new models.Event({
      status: enums.EVENT.STATUS.PENDING,
      status_rules: enums.EVENT.STATUS_RULES.OFF,
      status_theme: enums.EVENT.STATUS_THEME.DISABLED,
      status_entry: enums.EVENT.STATUS_ENTRY.OFF,
      status_results: enums.EVENT.STATUS_RESULTS.DISABLED,
      status_tournament: enums.EVENT.STATUS_TOURNAMENT.DISABLED,
      divisions: {
        solo: "48 hours<br />Everything from scratch",
        team: "48 hours<br />Everything from scratch",
        unranked: "72 hours<br />No rankings, just feedback",
      },
    }) as BookshelfModel;
    if (template) {
      event.set({
        title: template.get("event_title"),
        event_preset_id: template.get("event_preset_id"),
        divisions: template.get("divisions") || event.get("divisions"),
      });
      const details = event.related<BookshelfModel>("details");
      details.set({
        links: template.get("links"),
        category_titles: template.get("category_titles"),
      });
    }
    return event;
  }

  public areSubmissionsAllowed(event: BookshelfModel): boolean {
    return [enums.EVENT.STATUS_ENTRY.OPEN, enums.EVENT.STATUS_ENTRY.OPEN_UNRANKED].includes(event.get("status_entry"));
  }

  public isVotingInProgress(event: BookshelfModel): boolean {
    return [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE].includes(event.get("status_results"));
  }

  public getDefaultDivision(event: BookshelfModel): string {
    return Object.keys(event.get("divisions"))[0];
  }

  public getCategoryTitles(event: BookshelfModel): Array<string | undefined> {
    return range(1, constants.MAX_CATEGORY_COUNT + 1)
      .map(categoryIndex => {
        const eventDetails = event.related<BookshelfModel>("details");
        const categoryTitles = eventDetails.get("category_titles");
        const flags = eventDetails.get("flags") as EventFlags;
        if (categoryTitles.length > categoryIndex - 1) {
          return categoryTitles[categoryIndex - 1];
        } else if (flags.scoreSpacePodium && categoryIndex === 7) {
          return "ScoreSpace Awards";
        }
      });
  }

  /**
   * Fetches an models.Event by its ID, with all its Entries.
   */
  public async findEventById(id: number): Promise<BookshelfModel> {
    if (!cache.eventsById.get(id)) {
      const event = await models.Event.where("id", id)
        .fetch({ withRelated: ["details"] });
      cache.eventsById.set(id, event);
    }
    return cache.eventsById.get<BookshelfModel>(id);
  }

  /**
   * Fetches an models.Event by its name, with all its Entries.
   */
  public async findEventByName(name: string): Promise<BookshelfModel> {
    if (!cache.eventsByName.get(name)) {
      const event = await models.Event.where("name", name)
        .fetch({ withRelated: ["details"] });
      cache.eventsByName.set(name, event);
    }
    return cache.eventsByName.get<BookshelfModel>(name);
  }

  /**
   * Fetches all models.Events and their Entries.
   */
  public async findEvents(options: {
    name?: string;
    status?: string;
    statusNot?: string;
    allowingEntries?: boolean;
    sortDatesAscending?: "ASC" | "DESC";
    pageSize?: number;
    page?: number;
  } & FetchAllOptions = {}): Promise<BookshelfCollection> {
    let query = new models.Event()
      .orderBy("started_at", options.sortDatesAscending ? "ASC" : "DESC") as BookshelfModel;
    if (options.status) { query = query.where("status", options.status); }
    if (options.statusNot) { query = query.where("status", "<>", options.statusNot); }
    if (options.name) { query = query.where("name", options.name); }
    if (options.allowingEntries) {
      query = query.where("status_entry", "!=", enums.EVENT.STATUS_ENTRY.DISABLED);
    }
    if (options.pageSize) {
      return query.fetchPage(options);
    } else {
      return query.fetchAll(options) as Bluebird<BookshelfCollection>;
    }
  }

  /**
   * Fetches the currently live models.Event.
   * @returns {Event} The earliest pending event OR the currently open event OR the last closed event.
   */
  public async findEventByStatus(status: "pending" | "open" | "closed"): Promise<BookshelfModel> {
    let sortOrder: SortOrder = "ASC";
    if (status === enums.EVENT.STATUS.CLOSED) {
      sortOrder = "DESC";
    }
    return models.Event.where("status", status)
      .orderBy("started_at", sortOrder)
      .fetch();
  }

  /**
   * Searches for any external event name already submitted
   * @return {array(string)} external event names
   */
  public async searchForExternalEvents(nameFragment: string): Promise<string[]> {
    const results: Array<{ external_event: string }> = await db.knex("entry")
      .distinct()
      .select("external_event")
      .where("external_event", ilikeOperator(), `%${nameFragment}%`);

    const formattedResults: string[] = [];
    for (const result of results) {
      formattedResults.push(result.external_event);
    }
    formattedResults.sort((a, b) => {
      return a.localeCompare(b);
    });
    return formattedResults;
  }

  /**
   * Refreshes various models that cache the event name.
   * Call this after changing the name of an event.
   * @param {Event} event
   */
  public async refreshEventReferences(event: BookshelfModel): Promise<void> {
    // TODO Transaction
    const entryCollection = await models.Entry.where("event_id", event.id).fetchAll() as BookshelfCollection;
    for (const entry of entryCollection.models) {
      entry.set("event_name", event.get("name"));
      await entry.save();
    }
  }

  /**
   * Updates the event counters on an event
   * @param  {Event} event
   * @return {void}
   */
  public async refreshEventCounts(event: BookshelfModel): Promise<void> {
    const countByDivision = await db.knex("entry")
      .count("* as count").select("division")
      .where("event_id", event.get("id"))
      .where("published_at", "<=", createLuxonDate().toJSDate())
      .groupBy("division");

    let totalCount = 0;
    const divisionCounts = {};
    for (const row of countByDivision) {
      const count = parseInt(row.count as string, 10);
      divisionCounts[row.division] = count;
      totalCount += count;
    }
    if (!event.relations.details) {
      await event.load("details");
    }

    return db.transaction(async (transaction) => {
      event.set("entry_count", totalCount);
      await event.save(null, { transacting: transaction });

      const details = event.related<BookshelfModel>("details");
      details.set("division_counts", divisionCounts);
      await details.save(null, { transacting: transaction });

      cache.eventsById.del(event.get("id"));
      cache.eventsByName.del(event.get("name"));
    });
  }

  public getEventFlag(event: BookshelfModel, flag: keyof EventFlags): boolean {
    const flags = event.related<BookshelfModel>("details").get("flags") as EventFlags;
    return flags && flags[flag];
  }

}

export default new EventService();
