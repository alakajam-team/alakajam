import { GlobalLocals } from "./global.middleware";
import { Response } from "express";

export interface CustomResponse<T extends GlobalLocals> extends Response {
    locals: T;

    // Custom methods registered on middleware.ts
    errorPage(code: number, error?: Error|string): void;
    traceAndShowErrorPage(error?: Error): void;
}
