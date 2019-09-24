import { Response } from "express";
import { GlobalLocals } from "./global.middleware";

export interface CustomResponse<T extends GlobalLocals> extends Response {
  locals: T;

  // Custom methods registered on middleware.ts
  errorPage(code: number, error?: Error | string): void;
  traceAndShowErrorPage(error?: Error): void;
}
