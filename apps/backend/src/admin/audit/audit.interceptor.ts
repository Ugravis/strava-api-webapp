import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
} from '@kilotrace/shared/admin';
import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { catchError, concatMap, type Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../../auth/auth-request';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import {
  type AuditEntry,
  AdminAuditLogService,
} from './admin-audit-log.service';
import { AUDITED_KEY, type AuditedOptions } from './audited.decorator';

/**
 * Writes the audit entry of every `@Audited()` route once the handler has
 * run, successful or not. The response waits for the entry: an action is
 * never reported as done without its record.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AdminAuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditedOptions | undefined>(
      AUDITED_KEY,
      context.getHandler(),
    );
    if (!options) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const reason = readReason(request.body);
    if (options.destructive && !reason) {
      throw ApiErrors.badRequest(
        ApiErrorCode.ReasonRequired,
        `A reason of ${ADMIN_REASON_MIN_LENGTH} to ${ADMIN_REASON_MAX_LENGTH} characters is required`,
      );
    }

    const targetId = options.target
      ? request.params[options.target.param]
      : undefined;
    const actorId = request.auth?.user.id ?? null;
    const entry: Omit<AuditEntry, 'succeeded' | 'status'> = {
      actorId,
      action: options.action,
      targetType: options.target?.type ?? null,
      targetId: typeof targetId === 'string' ? targetId : null,
      reason,
      details: readDetails(options.details, request),
      hiddenBy: options.hidden ? actorId : null,
    };

    return next.handle().pipe(
      catchError(async (error: unknown) => {
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        await this.audit.record({ ...entry, succeeded: false, status });
        throw error;
      }),
      concatMap(async (result: unknown) => {
        const { statusCode } = http.getResponse<Response>();
        await this.audit.record({
          ...entry,
          succeeded: true,
          status: statusCode,
        });
        return result;
      }),
    );
  }
}

function readDetails(
  keys: readonly string[] | undefined,
  request: AuthenticatedRequest,
): Record<string, unknown> | null {
  const body: unknown = request.body;
  const source: Record<string, unknown> = {
    ...(body && typeof body === 'object' ? body : {}),
    ...request.params,
  };
  const details = Object.fromEntries(
    (keys ?? [])
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );
  return Object.keys(details).length > 0 ? details : null;
}

function readReason(body: unknown): string | null {
  const value =
    body && typeof body === 'object' && 'reason' in body ? body.reason : null;
  if (typeof value !== 'string') {
    return null;
  }
  const reason = value.trim();
  return reason.length >= ADMIN_REASON_MIN_LENGTH &&
    reason.length <= ADMIN_REASON_MAX_LENGTH
    ? reason
    : null;
}
