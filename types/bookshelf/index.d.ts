import "bookshelf";

declare module "bookshelf" {
  class BookshelfModel extends Model<any> {
  }
  class BookshelfCollection extends Collection<Model<any>> {
    models: Array<Model<any>>;
    pagination: {
      rowCount: number;
      pageCount: number;
      page: number;
      pageSize: number;
    };
  }
}
