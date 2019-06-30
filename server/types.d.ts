import { Response } from "express";
import { CommonLocals } from "./common.middleware";

declare global {
    namespace Express {
        interface ExpressSessionAsync extends Session {
            // Customized in middleware.ts > promisifySession()
            regenerateAsync(): Promise<void>;
            destroyAsync(): Promise<void>;
            reloadAsync(): Promise<void>;
            saveAsync(): Promise<void>;
        }
        
        export interface Request {
            session?: ExpressSessionAsync;
        }
    }
}

export interface CustomResponse<T extends CommonLocals> extends Response {
  locals: T;

  // Custom methods registered on middleware.ts
  errorPage(code: number, error?: Error | string): void;
  traceAndShowErrorPage(error?: Error): void;
}

export type RenderContext = {[key: string]: any};