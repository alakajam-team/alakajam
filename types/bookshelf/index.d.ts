/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-classes-per-file */

import "bookshelf";

declare module "bookshelf" {

  /*
   * Alakajam-specific model typings
   */

  class NodeBookshelfModel extends BookshelfModel {
    public likes: () => BookshelfCollection;
    public userRoles: () => BookshelfCollection;
    public comments: () => BookshelfModel;
  }

  class EntryBookshelfModel extends NodeBookshelfModel {
    public details: () => BookshelfModel;
    public sortedUserRoles: () => BookshelfModel[];
    public picturePreviews: () => any[];
    public pictureThumbnail: () => string | undefined;
    public pictureIcon: () => string | undefined;
  }

  class PostBookshelfModel extends NodeBookshelfModel {
    public entry: () => BookshelfModel;
    public event: () => BookshelfModel;
    public author: () => BookshelfModel;
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
    public relations?: Record<string, any>;
    public related<T extends BookshelfModel | BookshelfCollection>(relation: string): T;
    public related<R extends Model<any>>(relation: string): R | Collection<R>;
    public fetchPage?<T extends BookshelfModel>(options: FetchPageOptions): Promise<BookshelfCollectionOf<T>>;
  }

  class BookshelfCollection extends BookshelfCollectionOf<BookshelfModel> { }


  class BookshelfCollectionOf<T extends BookshelfModel> extends Collection<BookshelfModel> {
    public models?: T[];
    public pagination?: {
      rowCount: number;
      pageCount: number;
      page: number;
      pageSize: number;
    };

    public where(match: { [key: string]: any }, firstOnly?: boolean): T | BookshelfCollection;
    public difference(arrayValue: T[] | BookshelfCollectionOf<T>): T[];
    public difference(...values: T[]): T[];
    public slice(begin?: number, end?: number): T[];
    public includes(value: any, fromIndex?: number): boolean;
  }

}
