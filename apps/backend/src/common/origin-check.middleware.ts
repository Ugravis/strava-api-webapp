import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiErrorCode, ApiErrors } from './api-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense in depth on top of `SameSite=Lax` cookies: state-changing
 * requests sent by a browser must originate from the frontend or the back office.
 */
export function originCheck(allowedOrigins: string[]): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const origin = request.get('origin');
    if (
      SAFE_METHODS.has(request.method) ||
      !origin ||
      allowedOrigins.includes(origin)
    ) {
      return next();
    }
    next(
      ApiErrors.forbidden(
        ApiErrorCode.CrossOriginRejected,
        'Cross-origin request rejected',
      ),
    );
  };
}
