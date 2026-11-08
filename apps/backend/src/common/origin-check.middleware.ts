import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiErrorCode, ApiErrors } from './api-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense in depth on top of `SameSite=Lax` cookies: state-changing
 * requests sent by a browser must originate from the frontend.
 */
export function originCheck(allowedOrigin: string): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const origin = request.get('origin');
    if (
      SAFE_METHODS.has(request.method) ||
      !origin ||
      origin === allowedOrigin
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
