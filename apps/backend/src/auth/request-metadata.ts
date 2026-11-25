import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
} from '@kilotrace/shared';
import type { Request } from 'express';
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

/**
 * The language chosen on the site, kept in its cookie (the API is reached
 * through the site, on its host), otherwise the one of the browser.
 */
export function requestLocale(request: Request): Locale {
  const cookie: unknown = request.cookies?.[LOCALE_COOKIE];
  if (isLocale(cookie)) return cookie;
  return (
    localeFromAcceptLanguage(request.get('accept-language')) ?? DEFAULT_LOCALE
  );
}
