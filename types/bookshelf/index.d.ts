import "bookshelf";

declare module "bookshelf" {
  class BookshelfModel extends Model<any> {
    relations: Record<string, any>;
  }
  class BookshelfCollection extends Collection<Model<any>> {
    models: BookshelfModel[];
    pagination: {
      rowCount: number;
      pageCount: number;
      page: number;
      pageSize: number;
    };
  }
}
