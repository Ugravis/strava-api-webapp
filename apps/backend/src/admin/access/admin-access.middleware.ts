import { highestAdminRole } from '@kilotrace/shared/admin';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../auth/auth-request';
import { SessionCookie } from '../../auth/session-cookie';
import { SessionsService } from '../../auth/sessions/sessions.service';
import { adminNotFound } from './admin-not-found';

/**
 * First gate of `/api/admin`, run before routing: anyone without a
 * back-office role, signed in or not, gets the 404 of an unknown route,
 * whether the route exists or not. The roles come from the database with
 * the session, so a withdrawn role applies on the next request.
 */
@Injectable()
export class AdminAccessMiddleware implements NestMiddleware {
  constructor(
    private readonly sessions: SessionsService,
    private readonly sessionCookie: SessionCookie,
  ) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = this.sessionCookie.read(request);
    const validated = token ? await this.sessions.validate(token) : null;
    if (!validated || !highestAdminRole(validated.user.roles)) {
      throw adminNotFound(request);
    }
    // Picked up by the session guard, which does not validate it again.
    request.auth = { session: validated.session, user: validated.user };
    next();
  }
}
