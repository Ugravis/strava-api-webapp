import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { ADMIN_AREA_KEY } from '../../admin/decorators/admin-controller.decorator';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import type { AuthenticatedRequest } from '../auth-request';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionCookie } from '../session-cookie';
import { SessionsService } from '../sessions/sessions.service';

/**
 * Global guard: every route requires a valid session unless marked `@Public()`.
 * Back-office routes have their own guard and sessions.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly sessionCookie: SessionCookie,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    const isAdminArea = this.reflector.getAllAndOverride<boolean>(
      ADMIN_AREA_KEY,
      targets,
    );
    if (isPublic || isAdminArea) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.sessionCookie.read(request);
    const validated = token ? await this.sessions.validate(token) : null;
    if (!validated) {
      throw ApiErrors.unauthorized(
        ApiErrorCode.Unauthenticated,
        'Authentication required',
      );
    }

    const { session, user, renewed } = validated;
    // The cookie expiry follows the extended session, so activity keeps users signed in.
    if (renewed && session.persistent && token) {
      this.sessionCookie.write(context.switchToHttp().getResponse<Response>(), {
        token,
        expiresAt: session.expiresAt,
        persistent: true,
      });
    }
    request.auth = { session, user };
    return true;
  }
}
