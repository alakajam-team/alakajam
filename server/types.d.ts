import { GlobalLocals } from "./global.middleware";
import { Response } from "express";
import { Model, CollectionBase } from "bookshelf";

export interface CustomResponse<T extends GlobalLocals> extends Response {
  locals: T;

  // Custom methods registered on middleware.ts
  errorPage(code: number, error?: Error | string): void;
  traceAndShowErrorPage(error?: Error): void;
}

declare module "bookshelf" {
  class ModelAny extends Model<any> {
  }
  class CollectionAny extends Collection<Model<any>> {
    models: Array<Model<any>>;
  }
}
