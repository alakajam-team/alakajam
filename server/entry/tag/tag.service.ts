import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { ilikeOperator } from "server/core/config";
import db from "server/core/db";
import * as models from "server/core/models";
import { Tag } from "server/entity/tag.entity";

export interface TagStats {
  id: number;
  value: string;
  created_at: Date;
  count: number;
}

export class TagService {

  /**
   * Search for a tag by name.
   *
   * @param nameFragment a fragment of the name.
   * @returns {Bookshelf.Collection} tags matching the search.
   */
  public async searchTags(nameFragment: string): Promise<Tag[]> {
    const results = await db.knex("tag")
      .where("value", ilikeOperator(), `${nameFragment}%`);

    const formattedResults = [];
    for (const result of results) {
      formattedResults.push(result.value);
    }
    formattedResults.sort((a, b) => {
      return a.localeCompare(b);
    });
    return results;
  }

  /**
   * Fetch tag by ID
   */
  public async fetchById(id: number, options: any = {}): Promise<BookshelfModel> {
    return models.Tag.where({ id }).fetch(options);
  }

  /**
   * Fetch tag by ID
   */
  public async fetchByIds(ids: number[]): Promise<BookshelfCollection> {
    return models.Tag.where("id", "in", ids).fetchAll() as Bluebird<BookshelfCollection>;
  }

  /**
   * Creates a tag
   */
  public async createTag(value: string): Promise<BookshelfModel> {
    const tag = new models.Tag({ value });
    return tag.save();
  }

  /**
   * Updates entry/tag associations, creating any missing tags in the process.
   *
   */
  public async updateEntryTags(entry: BookshelfModel, tagInfo: string[]): Promise<void> {
    const entryId = entry.get("id");
    // Make sure missing tags haven't been created since
    const tagIds = tagInfo.map((strId) => parseInt(strId, 10))
      .filter((intId) => !isNaN(intId) && intId > 0);
    const tagLabels = tagInfo.filter((label) => isNaN(parseInt(label, 10)) && label.trim());
    const actuallyExistingTags = await models.Tag.where("value", "in", tagLabels).fetchAll();
    actuallyExistingTags.forEach((tag) => {
      tagIds.push(tag.get("id"));
      tagLabels.splice(tagLabels.indexOf(tag.get("value")), 1);
    });

    // Create missing tags
    for (const tagLabel of tagLabels) {
      const createdTag = await this.createTag(tagLabel);
      tagIds.push(createdTag.get("id"));
    }

    return db.knex.transaction(async (transaction) => {
      // Find existing relations
      const existingIds = (
        await transaction("entry_tag")
          .select("tag_id")
          .where("entry_id", entryId)
      ).map((row) => {
        return row.tag_id;
      });

      // Create/delete relations
      const toRemoveIds = existingIds.filter((id) => !tagIds.includes(id));
      const toAdd = tagIds.filter((id) => !existingIds.includes(id))
        .map((id) => ({
          entry_id: entryId,
          tag_id: id,
        }));
      if (toAdd.length > 0) { // Insert new entry_tag records.
        await transaction("entry_tag").insert(toAdd);
      }
      if (toRemoveIds.length > 0) { // Remove old entry_tag records.
        await transaction("entry_tag")
          .whereIn("tag_id", toRemoveIds)
          .andWhere("entry_id", "=", entryId)
          .del();
      }

      // Clear empty tags
      if (toRemoveIds.length > 0) {
        await transaction("tag")
          .whereNotIn("id", function() {
            void this.from("entry_tag").distinct("tag_id");
          })
          .del();
      }
    });
  }

  public async fetchTagStats(options: { orderByDate?: boolean } = {}): Promise<TagStats[]> {
    return db.knex("entry_tag")
      .select("tag.id", "tag.value", "tag.created_at", db.knex.raw("count(*) as count"))
      .leftJoin("tag", "entry_tag.tag_id", "tag.id")
      .groupBy("tag.id", "tag.value")
      .orderBy(options.orderByDate ? "created_at" : "count", "DESC") as any;
  }

}

export default new TagService();
