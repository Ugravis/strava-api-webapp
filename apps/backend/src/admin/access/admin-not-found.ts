import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The very error the router returns for an unknown route, so that nothing
 * tells an existing back-office route from a missing one.
 */
export function adminNotFound(request: Request): NotFoundException {
  return new NotFoundException(
    `Cannot ${request.method} ${request.originalUrl}`,
  );
}
