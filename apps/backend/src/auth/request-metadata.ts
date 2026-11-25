import type { Locale } from '@kilotrace/shared';
import type { Request } from 'express';
import { requestLocale } from '../common/request-locale';
import type { SessionMetadata } from './sessions/sessions.service';

/** What a request tells of its device, and the language of the site it comes from. */
export interface RequestMetadata extends SessionMetadata {
  locale: Locale;
}

export function requestMetadata(request: Request): RequestMetadata {
  return {
    userAgent: request.get('user-agent') ?? undefined,
    ipAddress: request.ip ?? undefined,
    locale: requestLocale(request),
  };
}
