import { ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorCode } from '../common/api-error';
import { isSuspended, type User } from '../users/user.entity';
import { SignedCookie } from './signed-cookie';

/** What a suspended user is told when a sign-in is refused. */
export interface SuspensionNotice {
  reason: string;
  /** Null for an indefinite suspension. */
  until: string | null;
}

/** A sign-in refused to a suspended account, once its credentials are proven. */
export class AccountSuspendedException extends ForbiddenException {
  constructor(readonly notice: SuspensionNotice) {
    super({
      code: ApiErrorCode.AccountSuspended,
      message: 'This account is suspended',
    });
  }
}

export function assertNotSuspended(user: User): void {
  if (isSuspended(user)) {
    throw new AccountSuspendedException({
      reason: user.suspensionReason ?? '',
      until: user.suspendedUntil?.toISOString() ?? null,
    });
  }
}

/**
 * Carries the notice to the sign-in page after a refused sign-in, an OAuth
 * redirect included, without putting the reason in a URL.
 */
export const suspensionCookie = new SignedCookie<SuspensionNotice>(
  'kilotrace_suspension',
  10 * 60 * 1000,
  '/api/auth/suspension',
);

export function writeSuspensionNotice(
  response: Response,
  error: AccountSuspendedException,
  secure: boolean,
): void {
  suspensionCookie.write(response, error.notice, secure);
}
