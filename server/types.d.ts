import { Request, Response } from "express";
import { CommonLocals } from "./common.middleware";

export interface Alert {
  type: "success" | "info" | "warning" | "danger";
  floating?: boolean;
  title?: string;
  message: string;
}

export interface CustomExpressSession extends Express.Session {
  // Customized in middleware.ts > promisifySession()
  regenerateAsync(): Promise<void>;
  destroyAsync(): Promise<void>;
  reloadAsync(): Promise<void>;
  saveAsync(): Promise<void>;

  // Session contents
  userId: number;
  alerts: Alert[];
}

export interface CustomRequest extends Request {
  session: CustomExpressSession;
  csrfToken: () => string;
}

export interface CustomResponse<T extends CommonLocals> extends Response {
  locals: T;

  // Custom methods registered on middleware.ts
  errorPage(code: number, error?: Error | string): void;
  traceAndShowErrorPage(error?: Error): void;
}

export type RenderContext = { [key: string]: any };
