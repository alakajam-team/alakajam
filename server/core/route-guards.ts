import { RequestHandler, RequestParamHandler } from "express";

export function skipRouteUnless(isValid: (value: string) => boolean): RequestParamHandler {
  return (_req, _res, next, value: string) => next(isValid(value) ? undefined : "route");
}

export function requireDigits(paramName: string): RequestHandler {
  return (req, _res, next) => next(/^\d+$/.test(req.params[paramName] as string) ? undefined : "route");
}
