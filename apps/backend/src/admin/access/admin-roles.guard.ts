import {
  type AdminPermission,
  highestAdminRole,
} from '@kilotrace/shared/admin';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../auth/auth-request';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { AUDITED_KEY, NOT_AUDITED_KEY } from '../audit/audited.decorator';
import { ADMIN_AREA_KEY } from './admin-controller.decorator';
import { adminNotFound } from './admin-not-found';
import { isAdminPath } from './admin-path';
import { AdminPermissionsService } from '../permissions/admin-permissions.service';
import { ANY_MEMBER, PERMISSION_KEY } from './permission.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global guard of the back office, denying by default: a route under
 * `/api/admin` must come from an `@AdminController()` and declare its
 * permission with `@Permission()`, and a state-changing route must be
 * `@Audited()`, or explicitly `@NotAudited()`. Routes elsewhere are left to the session guard.
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  private readonly logger = new Logger(AdminRolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: AdminPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const targets = [context.getHandler(), context.getClass()];
    const isAdminArea =
      this.reflector.getAllAndOverride<boolean>(ADMIN_AREA_KEY, targets) ===
      true;
    if (!isAdminArea && !isAdminPath(request.path)) {
      return true;
    }

    // Set by the access middleware; its absence means a misconfiguration.
    const roles = request.auth?.user.roles ?? [];
    if (!highestAdminRole(roles)) {
      throw adminNotFound(request);
    }
    if (!isAdminArea) {
      this.logger.error(`${request.path} is not an admin controller route`);
      throw forbidden();
    }

    const required = this.reflector.getAllAndOverride<
      AdminPermission | typeof ANY_MEMBER | undefined
    >(PERMISSION_KEY, targets);
    if (!required) {
      this.logger.error(
        `${request.method} ${request.path} declares no permission`,
      );
      throw forbidden();
    }
    if (
      required !== ANY_MEMBER &&
      !(await this.permissions.can(roles, required))
    ) {
      throw forbidden();
    }

    const audited =
      this.reflector.get<unknown>(AUDITED_KEY, context.getHandler()) ??
      this.reflector.get<unknown>(NOT_AUDITED_KEY, context.getHandler());
    if (!SAFE_METHODS.has(request.method) && !audited) {
      this.logger.error(`${request.method} ${request.path} is not audited`);
      throw forbidden();
    }
    return true;
  }
}

function forbidden() {
  return ApiErrors.forbidden(ApiErrorCode.AdminForbidden, 'Access denied');
}
