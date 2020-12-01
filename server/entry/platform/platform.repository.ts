
import { BookshelfModel } from "bookshelf";
import db from "server/core/db";
import log from "server/core/log";
import * as models from "server/core/models";
import { Platform } from "server/entity/platform.entity";
import { getRepository } from "typeorm";

export class PlatformRepositoryBookshelf {

  /**
   * Fetch platform by ID
   */
  public async findById(id: number): Promise<Platform> {
    const model = await models.Platform.where({ id }).fetch();
    return Platform.fromBookshelfModel(model);
  }

  /**
   * Fetch platforms by name (case-insensitive except in SQLite).
   */
  public async findAllByName(names: string[]): Promise<Platform[]> {
    const collection = await models.Platform
      .query((qb) => { qb.whereIn("name", names); })
      .fetchAll();
    return collection.map(model => Platform.fromBookshelfModel(model));
  }

  /**
   * Load all platform names.
   */
  public async findAllNames(): Promise<string[]> {
    const names = (await db.knex("platform").select("name")).map(({ name }: { name: string }) => name);
    names.sort();
    return names;
  }

  /** Fetch all platform instances. */
  public async findAll(): Promise<Platform[]> {
    const collection = await new models.Platform()
      .orderBy("name")
      .fetchAll();
    return collection.map(model => Platform.fromBookshelfModel(model));
  }

  /**
   * Counts the number of entries using a given platform
   */
  public async countEntriesByPlatform(platform: Platform): Promise<number> {
    const count = await models.EntryPlatform
      .where("platform_id", platform.id)
      .count();
    return parseInt(count.toString(), 10);
  }

  /**
   * Creates a platform
   */
  public createPlatform(name: string): Platform {
    const platform = new Platform();
    platform.name = name;
    return platform;
  }

  /**
   * Set the platforms of an entry.
   * The data is duplicated on `entry.platforms` (for quick access) and the `entry_platform` table (for search queries).
   */
  public async setEntryPlatforms(entry: BookshelfModel, platforms: Platform[]): Promise<void> {
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
  
  save(platform: Platform): Promise<Platform> {
    return getRepository(Platform).save(platform);
  }

  async delete(id: number) {
    if (id) {
      await getRepository(Platform).delete({ id });
    }
  }

}

export default new PlatformRepositoryBookshelf();
