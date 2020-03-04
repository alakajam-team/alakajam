import { Request, Response, Application } from "express";
import { CommonLocals } from "./common.middleware";
import { Config } from "./core/config";

export interface Alert {
  type: "success" | "info" | "warning" | "danger";
  floating?: boolean;
  title?: string;
  message: string;
}

export interface CustomExpressSession extends Express.Session {
  // Session contents
  userId: number;
  alerts: Alert[];

  // Customized in middleware.ts > promisifySession()
  regenerateAsync(): Promise<void>;
  destroyAsync(): Promise<void>;
  reloadAsync(): Promise<void>;
  saveAsync(): Promise<void>;
}

export type CustomApplication = Omit<Application, "locals"> & {
  locals: {
    devMode: boolean;
    config: Config;
    sessionStore: any;
    passwordRecoveryTokens: Record<string, { userId: number; expires: number }>;
  }
}

export interface CustomRequest extends Omit<Request, "app"> {
  /**
   * The user session, the object can be used to store any data we want to retain across the user session.
   * Be careful to save it (with session.saveAsync()) if you set anything, otherwise it will make the server stateful.
   */
  session: CustomExpressSession;
  app: CustomApplication;
  csrfToken: () => string;
}

export interface CustomResponse<T extends CommonLocals> extends Omit<Response, "app"> {
  locals: T;
  app: CustomApplication;

  // Custom methods registered on middleware.ts
  errorPage(code: number, error?: Error | string): void;
  traceAndShowErrorPage(error?: Error): void;
  redirectToLogin(): Promise<void>;
}

export interface RenderContext { [key: string]: any }
