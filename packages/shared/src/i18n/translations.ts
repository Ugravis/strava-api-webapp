import { LOCALES, type Locale } from "./locales";

/** The language the team writes the content of the site in. */
export const SOURCE_LOCALE = "fr" satisfies Locale;

/** The languages a content is translated into, from its source. */
export type TargetLocale = Exclude<Locale, typeof SOURCE_LOCALE>;

export const TARGET_LOCALES = LOCALES.filter((locale): locale is TargetLocale => locale !== SOURCE_LOCALE);

/** The translations of the fields `F` of a content, by language; a field missing falls back on English, then on the source. */
export type Translations<F extends string> = Partial<Record<TargetLocale, Partial<Record<F, string>>>>;

export function isTargetLocale(value: unknown): value is TargetLocale {
  return typeof value === "string" && (TARGET_LOCALES as readonly string[]).includes(value);
}

/** A field of a content in `locale`: its translation, else the English one, else the source. */
export function translated<F extends string, V extends string | null>(
  source: V,
  translations: Translations<F> | null | undefined,
  field: F,
  locale: Locale,
): V | string {
  if (locale === SOURCE_LOCALE) return source;
  return translations?.[locale]?.[field] || translations?.en?.[field] || source;
}

/** `PUT …/:id/translations`: one field of one language, null clears it. */
export interface UpdateTranslationRequest {
  locale: TargetLocale;
  field: string;
  value: string | null;
}

/** `POST …/:id/translations/fill`: the fields machine-translated. */
export interface FillTranslationsResponse {
  filled: number;
}
