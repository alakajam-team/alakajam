import * as Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as models from "server/core/models";

export class EventPresetService {

  /*
   * Creates an empty, unpersisted event preset.
   * @param {EventPreset} referencePreset Optional reference preset to clone data from
   */
  public createEventPreset(referencePreset?: BookshelfModel): BookshelfModel {
    const eventPreset = new models.EventPreset({
      countdown_config: { date: new Date(0) },
    });
    if (referencePreset) {
      const overrideAttributes = {
        id: null,
        title: (referencePreset.get("title") || "") + " (copy)",
      };
      eventPreset.set("countdown_config",
        Object.assign({}, referencePreset.get("countdown_config"), eventPreset.get("countdown_config")));
      eventPreset.set(Object.assign({}, referencePreset.attributes, overrideAttributes));
    }
    return eventPreset;
  }

  /**
   * Finds all event presets.
   */
  public async findEventPresets(): Promise<BookshelfCollection> {
    return models.EventPreset
      .forge<BookshelfModel>()
      .orderBy("title")
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  /**
   * Finds an event preset.
   * @param {number} id
   */
  public async findEventPresetById(id: number): Promise<BookshelfModel> {
    return models.EventPreset
      .where({ id })
      .fetch({ withRelated: ["events"] });
  }

  /**
   * Deletes an event preset after making sure no event is currently using it.
   * @param {EventPreset} eventPreset
   */
  public async deleteEventPreset(eventPreset: BookshelfModel): Promise<any> {
    await eventPreset.load("events");
    const eventsUsingPreset = (eventPreset.related("events")).length;
    if (eventsUsingPreset > 0) {
      throw new Error(`Cannot delete preset ${eventPreset.get("title")} `
        + `because ${eventsUsingPreset} events depend on it`);
    } else {
      return eventPreset.destroy();
    }
  }

}

export default new EventPresetService();
