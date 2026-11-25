import {
  type FillTranslationsRequest,
  SOURCE_LOCALE,
  staleTranslations,
  TARGET_LOCALES,
  type TargetLocale,
  type TranslationSources,
  type Translations,
  type UpdateTranslationRequest,
} from '@kilotrace/shared';
import type { FieldRules } from '@kilotrace/shared/rules';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { TranslationService } from '../translation/translation.service';
import { ApiErrorCode, ApiErrors } from './api-error';
import { assertRules } from './field-rules';

export class UpdateTranslationDto implements UpdateTranslationRequest {
  @IsIn(TARGET_LOCALES)
  locale!: TargetLocale;

  @IsString()
  @MaxLength(40)
  field!: string;

  @IsOptional()
  @IsString()
  value!: string | null;
}

export class FillTranslationsDto implements FillTranslationsRequest {
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}

/** The translations of a content and the source each one was made from. */
export interface TranslationState<F extends string> {
  translations: Translations<F>;
  sources: TranslationSources<F>;
}

/** The state of a row keeping its translations in its own columns. */
export function stateOf<F extends string>(row: {
  translations: Translations<F>;
  translationSources: TranslationSources<F>;
}): TranslationState<F> {
  return { translations: row.translations, sources: row.translationSources };
}

/** The columns of a row for a state. */
export function columnsOf<F extends string>({
  translations,
  sources,
}: TranslationState<F>) {
  return { translations, translationSources: sources };
}

/** `value` set for `field` in `locale` (removed when null), the empty languages dropped. */
function setField<F extends string>(
  map: Translations<F>,
  locale: TargetLocale,
  field: F,
  value: string | null,
): Translations<F> {
  const fields: Partial<Record<F, string>> = { ...map[locale] };
  if (value) fields[field] = value;
  else delete fields[field];
  const next: Translations<F> = { ...map, [locale]: fields };
  if (Object.keys(fields).length === 0) delete next[locale];
  return next;
}

/**
 * A content once one field of one language is typed by hand, or cleared
 * (null or blank): checked against the rule of its source field, and
 * following its source as it is now.
 */
export function withTranslation<F extends string>(
  { translations, sources }: TranslationState<F>,
  source: Partial<Record<F, string | null>>,
  fields: readonly F[],
  rules: FieldRules<Record<F, string | null>>,
  { locale, field, value }: UpdateTranslationDto,
): TranslationState<F> {
  if (!(fields as readonly string[]).includes(field)) {
    throw ApiErrors.badRequest(
      ApiErrorCode.InvalidField,
      `${field} is not translated`,
    );
  }
  const name = field as F;
  const text = value?.trim() || null;
  if (text !== null) {
    assertRules(rules, { [name]: text } as Partial<Record<F, string | null>>, {
      partial: true,
    });
  }
  return {
    translations: setField(translations, locale, name, text),
    sources: setField(
      sources,
      locale,
      name,
      text && (source[name]?.trim() || null),
    ),
  };
}

/**
 * What the content of the team is, told to DeepL with every text of it, in
 * French as the texts are: it reads it best so (a context in English, or
 * French words quoted, left names untranslated).
 */
const APP =
  "Kilotrace, application de sport : les sorties de course, vélo et randonnée importées de Strava colorient les tuiles de la carte, comptent les gares traversées et cumulent les distances. Les membres s'abonnent les uns aux autres comme sur un réseau social.";

export const TRANSLATION_CONTEXTS = {
  badge: `Nom et description d'un badge de ${APP} La plupart des badges récompensent une distance cumulée égale au tour (la circonférence) d'une planète, d'une lune ou de la Terre, ou à une profondeur, une altitude, un nombre.`,
  badgeTheme: `Nom d'une collection regroupant des badges de ${APP}`,
  userTag: `Nom et description d'un insigne affiché sur le profil d'un membre de ${APP}`,
  teamNote: `Message de l'équipe de modération de ${APP} à un membre, par exemple la raison de la réinitialisation de son profil.`,
  releaseNote: `Note de mise à jour d'une nouvelle version de ${APP} En Markdown, mise en forme conservée.`,
} as const;

/**
 * Machine-translates through DeepL, from their source, the fields of every
 * language that are empty or out of date (their source changed since), or
 * with `all` every one, those typed by hand included. Refused when it
 * cannot translate.
 */
export async function fillTranslations<F extends string>(
  translation: TranslationService,
  source: Partial<Record<F, string | null>>,
  state: TranslationState<F>,
  fields: readonly F[],
  context: string,
  all = false,
): Promise<TranslationState<F> & { filled: number }> {
  if (!translation.enabled) {
    throw ApiErrors.unavailable(
      ApiErrorCode.TranslationUnavailable,
      'Machine translation is not set up',
    );
  }
  const stale = staleTranslations(source, state.translations, state.sources);
  let { translations, sources } = state;
  let filled = 0;
  for (const locale of TARGET_LOCALES) {
    const wanted = fields.filter(
      (field) =>
        source[field]?.trim() &&
        (all ||
          !state.translations[locale]?.[field] ||
          stale[locale]?.includes(field)),
    );
    if (wanted.length === 0) continue;
    const texts = await translation.translate(
      wanted.map((field) => source[field]!.trim()),
      locale,
      { source: SOURCE_LOCALE, context },
    );
    if (!texts) {
      throw ApiErrors.unavailable(
        ApiErrorCode.TranslationUnavailable,
        'Machine translation failed',
      );
    }
    wanted.forEach((field, i) => {
      translations = setField(translations, locale, field, texts[i].text);
      sources = setField(sources, locale, field, source[field]!.trim());
    });
    filled += wanted.length;
  }
  return { translations, sources, filled };
}
