import Bluebird from "bluebird";
import { BookshelfCollection, BookshelfModel } from "bookshelf";
import * as models from "server/core/models";

export class EventTemplateService {

  /**
   * Creates an empty, unpersisted event template.
   */
  public createEventTemplate(): BookshelfModel {
    return new models.EventTemplate();
  }

  /**
   * Finds all event templates.
   */
  public async findEventTemplates(): Promise<BookshelfCollection> {
    return new models.EventTemplate()
      .orderBy("title")
      .fetchAll() as Bluebird<BookshelfCollection>;
  }

  /**
   * Finds an event template.
   * @param {number} id
   */
  public async findEventTemplateById(id: number) {
    return models.EventTemplate.where({ id }).fetch();
  }

  /**
   * Deletes an event template.
   * @param {EventTemplate} eventTemplate
   */
  public async deleteEventTemplate(eventTemplate: BookshelfModel) {
    return eventTemplate.destroy();
  }
}

export default new EventTemplateService();
