import "bookshelf";
import { LoDashExplicitObjectWrapper } from "lodash";

declare module "bookshelf" {

  /*
   * Alakajam-specific model typings
   */

  class NodeBookshelfModel extends BookshelfModel {
    likes: () => BookshelfCollection;
    userRoles: () => BookshelfCollection;
    comments: () => BookshelfModel;
  }

  class EntryBookshelfModel extends NodeBookshelfModel {
    details: () => BookshelfModel;
    sortedUserRoles: () => BookshelfModel[];
    picturePreviews: () => any[];
    pictureThumbnail: () => string | undefined;
    pictureIcon: () => string | undefined;
  }

  class PostBookshelfModel extends NodeBookshelfModel {
    entry: () => BookshelfModel;
    event: () => BookshelfModel;
    author: () => BookshelfModel;
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
		related<T>(relation: string): T;
		related<R extends Model<any>>(relation: string): R | Collection<R>;
    relations?: Record<string, any>;
    fetchPage?<T extends BookshelfModel>(options: FetchPageOptions): Promise<BookshelfCollectionOf<T>>;
  }

  class BookshelfCollection extends BookshelfCollectionOf<BookshelfModel> { }

  class BookshelfCollectionOf<T extends BookshelfModel> extends Collection<BookshelfModel> {
    where(match: { [key: string]: any }, firstOnly?: boolean): T | BookshelfCollection;
    difference(arrayValue: T[] | BookshelfCollectionOf<T>): T[];
		difference(...values: T[]): T[];
    slice(begin?: number, end?: number): T[];
    includes(value: any, fromIndex?: number): boolean;

    models?: T[];
    pagination?: {
      rowCount: number;
      pageCount: number;
      page: number;
      pageSize: number;
    };
  }

}
