import "bookshelf";
import { LoDashExplicitObjectWrapper } from "lodash";

declare module "bookshelf" {

  /*
   * Alakajam-specific model typings
   */

  class EntryBookshelfModel extends BookshelfModel {
    sortedUserRoles: () => BookshelfModel[];
    picturePreviews: () => any[];
    pictureThumbnail: () => string | undefined;
    pictureIcon: () => string | undefined;
  }

  class PostBookshelfModel extends BookshelfModel {
    userRoles: () => BookshelfCollection;
  }
  

  /*
   * Original typings do not support the "registry" and "pagination" plugins
   * (NB. Sep 13, 2019: could arrive soon now that they are integrated into the core in v1.0.0)
   *
   * There are also a number of mistakes and annoyances, some fixable here, some not (eg. count(), use of Bluebird, etc.)
   */

  export interface FetchPageOptions extends FetchAllOptions {
    pageSize?: number;
    page?: number;
    limit?: number;
    offset?: number;
    debug?: boolean;
  }
  class BookshelfModel extends Model<BookshelfModel> {
    relations?: Record<string, any>;
    fetchPage?: (options: FetchPageOptions) => Promise<BookshelfCollection>;
  }

  class BookshelfCollection extends Collection<BookshelfModel> {
    where(match: { [key: string]: any }, firstOnly?: boolean): BookshelfModel | BookshelfCollection;
    difference(arrayValue: BookshelfModel | BookshelfModel[] | BookshelfCollection): BookshelfModel[];
    slice(begin?: number, end?: number): BookshelfModel[];
		includes(value: any, fromIndex?: number): boolean;

    models?: BookshelfModel[];
    pagination?: {
      rowCount: number;
      pageCount: number;
      page: number;
      pageSize: number;
    };
  }
}
