import { PATHNAMES } from "@kilotrace/shared";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from "@kilotrace/ui/i18n/locale";
import { defineRouting } from "next-intl/routing";

/**
 * English without a prefix, the other languages under `/fr`, `/it`…, each
 * page at the address of its language (`PATHNAMES`: `/fr/connexion`). The
 * choice is kept a year in a cookie.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365 },
  pathnames: PATHNAMES,
});
