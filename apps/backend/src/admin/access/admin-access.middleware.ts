import {
  ADMIN_SESSION_COOKIE,
  highestAdminRole,
} from '@kilotrace/shared/admin';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../auth/auth-request';
import { SessionsService } from '../../auth/sessions/sessions.service';
import adminConfig, { type AdminConfig } from '../../config/admin.config';
import { hasGatewaySecret } from './admin-gateway';
import { adminNotFound } from './admin-not-found';
import { isAdminSignInPath } from './admin-path';

/**
 * First gate of `/api/admin`, run before routing. Three barriers, each
 * answering the 404 of an unknown route, whether the route exists or not:
 * the secret of the admin app, which the public site never holds; a
 * session of the back office, which the session of the site is not; a
 * back-office role, read from the database with the session, so that a
 * withdrawn role applies on the next request. The sign-in routes only
 * need the secret.
 */
@Injectable()
export class AdminAccessMiddleware implements NestMiddleware {
  constructor(
    private readonly sessions: SessionsService,
    @Inject(adminConfig.KEY) private readonly config: AdminConfig,
  ) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    if (!hasGatewaySecret(request, this.config.gatewaySecret)) {
      throw adminNotFound(request);
    }
    if (isAdminSignInPath(request.path)) {
      return next();
    }
    const cookies = request.cookies as Record<string, string | undefined>;
    const token = cookies[ADMIN_SESSION_COOKIE];
    const validated = token
      ? await this.sessions.validate(token, 'admin')
      : null;
    if (!validated || !highestAdminRole(validated.user.roles)) {
      throw adminNotFound(request);
    }
    // Picked up by the session guard, which does not validate it again.
    request.auth = { session: validated.session, user: validated.user };
    next();
  }
}
