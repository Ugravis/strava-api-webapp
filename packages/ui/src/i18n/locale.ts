import type { Locale } from "@kilotrace/shared";

export { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER, LOCALES, type Locale } from "@kilotrace/shared";

/** The back office has a single language. */
export const ADMIN_LOCALE: Locale = "fr";

/** Each language named in itself, as a language menu lists them. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  de: "Deutsch",
};

/** Region of each language, as Open Graph spells it. */
export const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  it: "it_IT",
  es: "es_ES",
  de: "de_DE",
};

export const TIME_ZONE = "Europe/Paris";
