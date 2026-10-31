/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-classes-per-file */

import "bookshelf";
import BlueBird = require("bluebird");

declare module "bookshelf" {

  /*
   * Alakajam-specific model typings
   */

  class NodeBookshelfModel extends BookshelfModel {
    public likes: () => BookshelfCollection;
    public userRoles: () => BookshelfCollection;
    public comments: () => BookshelfCollection;
    public nodeType: () => "post" | "entry";
  }

  /**
   * Comments, likes and user roles. Requires loading both `post` and `entry` relations.
   */
  class NodeChildBookshelfModel extends BookshelfModel {
    public node: () => NodeBookshelfModel;
  }

  class EntryBookshelfModel extends NodeBookshelfModel {
    public details: () => BookshelfModel;
    public sortedUserRoles: () => BookshelfModel[];
    public picturePreviews: () => string[];
    public pictureThumbnail: () => string | undefined;
    public pictureIcon: () => string | undefined;
  }

  class PostBookshelfModel extends NodeBookshelfModel {
    public entry: () => BookshelfModel;
    public event: () => BookshelfModel;
    public author: () => BookshelfModel;
  }

  class CommentBookshelfModel extends NodeChildBookshelfModel {
    public wasEdited: () => boolean;
  }

  /*
   * Original typings do not support the "registry" and "pagination" plugins
   * (NB. Sep 13, 2019: could arrive soon now that they are integrated into the core in v1.0.0)
   *
   * There are also a number of mistakes and annoyances, some fixable here, some not (eg. count(), use of Bluebird, etc.)
   */

  class BookshelfModel extends Model<BookshelfModel> {
    public relations?: Record<string, any>;
    public related<T extends BookshelfModel | BookshelfCollection>(relation: string): T;
    public related<R extends Model<any>>(relation: string): R | Collection<R>;
    public load<T extends BookshelfModel | BookshelfCollection>(
      relations: string | string[], options?: SyncOptions): BlueBird<T>; // Fix wrong options type
  }

  // Fixes & additions to the original Collection typings (merged so that plain Collections remain assignable)
  interface Collection<T extends Model<any>> {
    /**
     * Actually returns T or T[]
     */
    where(match: { [key: string]: any }, firstOnly?: boolean): any;
    difference(arrayValue: T[] | Collection<T>): T[];
    difference(...values: T[]): T[];
    slice(begin?: number, end?: number): T[];
    pagination?: Pagination["pagination"];
  }

  class BookshelfCollection extends BookshelfCollectionOf<BookshelfModel> { }

  class BookshelfCollectionOf<T extends BookshelfModel> extends Collection<BookshelfModel> {
    public models?: T[];
  }

}
