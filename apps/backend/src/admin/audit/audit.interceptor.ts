import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
} from '@kilotrace/shared';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, concatMap, type Observable } from 'rxjs';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import type { AdminRequest } from '../admin-request';
import { type AuditEntry, AuditLogService } from './audit-log.service';
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
    private readonly audit: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditedOptions | undefined>(
      AUDITED_KEY,
      context.getHandler(),
    );
    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const reason = readReason(request.body);
    if (options.requireReason && !reason) {
      throw ApiErrors.badRequest(
        ApiErrorCode.ReasonRequired,
        `A reason of ${ADMIN_REASON_MIN_LENGTH} to ${ADMIN_REASON_MAX_LENGTH} characters is required`,
      );
    }

    const targetId = options.target
      ? request.params[options.target.param]
      : undefined;
    const entry: Omit<AuditEntry, 'succeeded'> = {
      actorId: request.adminAuth?.admin.id ?? null,
      action: options.action,
      targetType: options.target?.type ?? null,
      targetId: typeof targetId === 'string' ? targetId.slice(0, 100) : null,
      reason,
      ipAddress: request.ip ?? null,
    };

    return next.handle().pipe(
      catchError(async (error: unknown) => {
        await this.audit.record({ ...entry, succeeded: false });
        throw error;
      }),
      concatMap(async (result: unknown) => {
        await this.audit.record({ ...entry, succeeded: true });
        return result;
      }),
    );
  }
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
