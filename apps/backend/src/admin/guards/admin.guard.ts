import { type AdminRole, hasAdminRole } from '@kilotrace/shared';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_PREFIX } from '../../common/api-prefix';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import type { AdminRequest } from '../admin-request';
import { readAdminSessionCookie } from '../admin-session-cookie';
import { AUDITED_KEY } from '../audit/audited.decorator';
import { ADMIN_AREA_KEY } from '../decorators/admin-controller.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminSessionsService } from '../sessions/admin-sessions.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ADMIN_PATH = `/${API_PREFIX}/admin`;

/**
 * Global guard of the back office, denying by default: a route under
 * `/api/admin` must come from an `@AdminController()`, the caller needs an
 * active back-office session whose account, read from the database on every
 * request, holds the `@Roles()` of the route, and a state-changing route must
 * be `@Audited()`. Other routes are left to the user session guard.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: AdminSessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const targets = [context.getHandler(), context.getClass()];
    const isAdminArea =
      this.reflector.getAllAndOverride<boolean>(ADMIN_AREA_KEY, targets) ===
      true;
    if (!isAdminArea) {
      if (isAdminPath(request.path)) {
        this.logger.error(`${request.path} is not an admin controller route`);
        throw forbidden();
      }
      return true;
    }

    const token = readAdminSessionCookie(request);
    const validated = token ? await this.sessions.validate(token) : null;
    if (!validated) {
      throw ApiErrors.unauthorized(
        ApiErrorCode.Unauthenticated,
        'Back-office authentication required',
      );
    }

    const required = this.reflector.getAllAndOverride<AdminRole | undefined>(
      ROLES_KEY,
      targets,
    );
    if (!required || !hasAdminRole(validated.admin.role, required)) {
      throw forbidden();
    }

    const audited = this.reflector.get<unknown>(
      AUDITED_KEY,
      context.getHandler(),
    );
    if (!SAFE_METHODS.has(request.method) && !audited) {
      this.logger.error(`${request.method} ${request.path} is not audited`);
      throw forbidden();
    }

    request.adminAuth = validated;
    return true;
  }
}

/** Case and repeated slashes are ignored, as the router does. */
function isAdminPath(path: string): boolean {
  const normalized = path.toLowerCase().replace(/\/{2,}/g, '/');
  return normalized === ADMIN_PATH || normalized.startsWith(`${ADMIN_PATH}/`);
}

function forbidden() {
  return ApiErrors.forbidden(ApiErrorCode.AdminForbidden, 'Access denied');
}
