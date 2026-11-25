import { AsyncLocalStorage } from 'node:async_hooks';
import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localeFromAcceptLanguage,
} from '@kilotrace/shared';
import type { NextFunction, Request, Response } from 'express';

/**
 * The language of the page a request comes from: told by the site, else
 * kept in its cookie (the API is reached through the site, on its host),
 * else the one of the browser.
 */
export function requestLocale(request: Request): Locale {
  const header = request.get(LOCALE_HEADER);
  if (isLocale(header)) return header;
  const cookie: unknown = request.cookies?.[LOCALE_COOKIE];
  if (isLocale(cookie)) return cookie;
  return (
    localeFromAcceptLanguage(request.get('accept-language')) ?? DEFAULT_LOCALE
  );
}

const storage = new AsyncLocalStorage<Locale>();

/** Keeps the language of each request for the code it runs, without passing it along. */
export function requestLocaleContext(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  storage.run(requestLocale(request), next);
}

/** The language of the request being served; the default one outside of a request (jobs). */
export function currentLocale(): Locale {
  return storage.getStore() ?? DEFAULT_LOCALE;
}
