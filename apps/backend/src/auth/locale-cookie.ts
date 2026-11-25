import { type Locale, LOCALE_COOKIE } from '@kilotrace/shared';
import type { Response } from 'express';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Gives the site the language of the account signing in: its proxy then
 * serves the pages under that prefix. Same cookie as the one the site writes
 * when the language is changed, readable by its scripts.
 */
export function writeLocaleCookie(
  response: Response,
  locale: Locale,
  secure: boolean,
): void {
  response.cookie(LOCALE_COOKIE, locale, {
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: YEAR_MS,
  });
}
