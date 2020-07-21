
import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import cache from "server/core/cache";
import db from "server/core/db";
import log from "server/core/log";
import * as models from "server/core/models";


/**
 * Service for manipulating game platforms
 */
export class PlatformService {

  /**
   * Fetch platform by ID
   */
  public async fetchById(id: number): Promise<BookshelfModel> {
    return models.Platform.where({ id }).fetch();
  }

  /**
   * Fetch platforms by name (case-insensitive except in SQLite).
   */
  public fetchMultipleNamed(names: string[]): Promise<BookshelfCollection> {
    return models.Platform.query((qb) => { qb.whereIn("name", names); })
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  /**
   * Load all platform names.
   */
  public async fetchAllNames(): Promise<string[]> {
    const names = (await db.knex("platform").select("name")).map(({name}: { name: string }) => name);
    names.sort();
    return names;
  }

  /** Fetch all platform instances. */
  public async fetchAll(): Promise<BookshelfCollection> {
    if (!cache.general.get("platforms")) {
      cache.general.set("platforms",
        await new models.Platform()
          .orderBy("name")
          .fetchAll());
    }
    return cache.general.get<BookshelfCollection>("platforms");
  }

  /**
   * Counts the number of entries using a given platform
   */
  public async countEntriesByPlatform(platform: BookshelfModel): Promise<number> {
    const count = await models.EntryPlatform
      .where("platform_id", platform.get("id"))
      .count();
    return parseInt(count.toString(), 10);
  }

  /**
   * Creates a platform
   */
  public createPlatform(name: string): BookshelfModel {
    return new models.Platform({ name }) as BookshelfModel;
  }

  /**
   * Set the platforms of an entry.
   * The data is duplicated on `entry.platforms` (for quick access) and the `entry_platform` table (for search queries).
   */
  public async setEntryPlatforms(entry: BookshelfModel, platforms: BookshelfModel[]): Promise<void> {
    const entryId = entry.get("id");
    const platformNames = platforms.map((p) => p.get("name"));
    const platformIds = platforms.map((p) => p.id);

    try {
      await db.knex.transaction(async (transaction) => {
        const existingIds = (
          await transaction("entry_platform")
            .select("platform_id")
            .where("entry_id", entryId)
        ).map(({ platform_id }) => platform_id); // eslint-disable-line camelcase
        const toRemoveIds = existingIds.filter((id) => !platformIds.includes(id));
        const toAdd = platforms
          .filter((p) => !existingIds.includes(p.id))
          .map((p) => ({
            entry_id: entryId,
            platform_id: p.id,
            platform_name: p.get("name"),
          }));

        await entry.save("platforms", platformNames, { transacting: transaction });

        if (toAdd.length > 0) { // Insert new entry_platform records.
          await transaction("entry_platform").insert(toAdd);
        }
        if (toRemoveIds.length > 0) { // Remove old entry_platform records.
          await transaction("entry_platform")
            .whereIn("platform_id", toRemoveIds)
            .andWhere("entry_id", "=", entryId)
            .del();
        }
      });
    } catch (e) {
      log.error("Failed to update entry platforms: " + e.message);
      log.error(e.stack);
    }
  }

}

export default new PlatformService();
