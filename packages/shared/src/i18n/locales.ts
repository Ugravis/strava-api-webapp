/** Languages of the public site. French is the source language, English the reference: always complete, and the fallback of the others. */
export const LOCALES = ["en", "fr", "it", "es", "de"] as const;

export type Locale = (typeof LOCALES)[number];

/** Served without a prefix, and given to accounts whose language is unknown. */
export const DEFAULT_LOCALE: Locale = "en";

/** Name of the cookie keeping the language chosen on the site. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Sent by the site with every call to the API: the language of the page that makes it. */
export const LOCALE_HEADER = "X-Locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The first supported language of an `Accept-Language` header, by preference order. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return { language: tag.trim().toLowerCase().split("-")[0], weight: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  return ranked.map((entry) => entry.language).find(isLocale) ?? null;
}

/**
 * The path of a page of the site in `locale`, prefixed unless it is the
 * default language, as the site routes them; for links built outside of it,
 * e.g. in emails.
 */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
