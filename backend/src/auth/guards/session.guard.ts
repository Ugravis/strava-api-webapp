import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import type { AuthenticatedRequest } from '../auth-request';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionCookie } from '../session-cookie';
import { SessionsService } from '../sessions/sessions.service';

/** Global guard: every route requires a valid session unless marked `@Public()`. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly sessionCookie: SessionCookie,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
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

    request.auth = validated;
    return true;
  }
}
