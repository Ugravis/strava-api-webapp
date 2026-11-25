import { LOCALES, type Locale } from "./locales";

/** The language the team writes the content of the site in. */
export const SOURCE_LOCALE = "fr" satisfies Locale;

/** The languages a content is translated into, from its source. */
export type TargetLocale = Exclude<Locale, typeof SOURCE_LOCALE>;

export const TARGET_LOCALES = LOCALES.filter((locale): locale is TargetLocale => locale !== SOURCE_LOCALE);

/** The translations of the fields `F` of a content, by language; a field missing falls back on English, then on the source. */
export type Translations<F extends string> = Partial<Record<TargetLocale, Partial<Record<F, string>>>>;

/**
 * The source text each translation was made from (typed by hand or by
 * DeepL), same shape as the translations: once the source changes, the
 * translation no longer follows it.
 */
export type TranslationSources<F extends string> = Translations<F>;

/** The fields of each language whose source changed since they were translated. */
export function staleTranslations<F extends string>(
  source: Partial<Record<F, string | null>>,
  translations: Translations<F>,
  sources: TranslationSources<F>,
): Partial<Record<TargetLocale, F[]>> {
  const stale: Partial<Record<TargetLocale, F[]>> = {};
  for (const locale of TARGET_LOCALES) {
    const fields = (Object.keys(translations[locale] ?? {}) as F[]).filter(
      (field) => (sources[locale]?.[field] ?? null) !== (source[field]?.trim() || null),
    );
    if (fields.length > 0) stale[locale] = fields;
  }
  return stale;
}

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

/**
 * `POST …/:id/translations/fill`: the fields missing or out of date in every
 * language machine-translated; `all` every one, those typed by hand included.
 */
export interface FillTranslationsRequest {
  all?: boolean;
}

/** `POST …/:id/translations/fill`: the fields machine-translated. */
export interface FillTranslationsResponse {
  filled: number;
}
