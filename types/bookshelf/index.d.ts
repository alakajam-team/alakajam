import "bookshelf";

declare module "bookshelf" {
  class ModelAny extends Model<any> {
  }
  class CollectionAny extends Collection<Model<any>> {
    models: Array<Model<any>>;
  }
}
